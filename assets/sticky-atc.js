if (!customElements.get('sticky-atc')) {
  customElements.define(
    'sticky-atc',
    class StickyAtc extends HTMLElement {
      connectedCallback() {
        this.sectionId = this.dataset.sectionId;
        this.mainButton = document.getElementById(`ProductSubmitButton-${this.sectionId}`);
        if (!this.mainButton) return;

        this.button = this.querySelector('.sticky-atc__button');
        this.priceElement = this.querySelector('.sticky-atc__price');
        this.image = this.querySelector('.sticky-atc__media img');

        this.button.addEventListener('click', () => {
          this.mainButton.click();
        });

        this.observer = new IntersectionObserver(([entry]) => {
          const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
          this.classList.toggle('is-visible', scrolledPast);
          this.setAttribute('aria-hidden', String(!scrolledPast));
        });
        this.observer.observe(this.mainButton);

        if (typeof subscribe !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
          this.variantChangeUnsubscriber = subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
            if (event.data.sectionId !== this.sectionId) return;
            this.syncFromMain(event.data.variant);
          });
        }
      }

      disconnectedCallback() {
        this.observer?.disconnect();
        this.variantChangeUnsubscriber?.();
      }

      syncFromMain(variant) {
        // product-info.js updates the main button and price before publishing
        // variantChange, so the main section is the source of truth here.
        this.button.toggleAttribute('disabled', this.mainButton.hasAttribute('disabled'));
        const mainLabel = this.mainButton.querySelector('span');
        const stickyLabel = this.button.querySelector('span');
        if (mainLabel && stickyLabel) stickyLabel.textContent = mainLabel.textContent.trim();

        const priceContainer = document.getElementById(`price-${this.sectionId}`);
        if (priceContainer && this.priceElement) {
          const onSale = priceContainer.querySelector('.price--on-sale');
          const priceItem = onSale
            ? priceContainer.querySelector('.price-item--sale')
            : priceContainer.querySelector('.price-item--regular');
          if (priceItem) this.priceElement.textContent = priceItem.textContent.trim();
        }

        const imageSrc = variant?.featured_media?.preview_image?.src;
        if (imageSrc && this.image) {
          const url = new URL(imageSrc, window.location.origin);
          url.searchParams.set('width', '120');
          this.image.src = url.href;
        }
      }
    }
  );
}
