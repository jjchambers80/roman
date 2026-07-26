if (!customElements.get('sticky-atc')) {
  customElements.define(
    'sticky-atc',
    class StickyAtc extends HTMLElement {
      connectedCallback() {
        // Re-parent to <body> so position: fixed is always viewport-relative —
        // a transformed/filtered ancestor would otherwise become the containing
        // block and crop the bar at the viewport edges.
        if (this.parentElement !== document.body) {
          document.body.appendChild(this);
          return;
        }
        this.sectionId = this.dataset.sectionId;
        this.mainButton = document.getElementById(`ProductSubmitButton-${this.sectionId}`);
        if (!this.mainButton) return;

        this.button = this.querySelector('.sticky-atc__button');
        this.priceElement = this.querySelector('.sticky-atc__price');
        this.image = this.querySelector('.sticky-atc__media img');
        this.mobileQuery = window.matchMedia('(max-width: 749px)');
        this.alwaysVisibleMobile = this.hasAttribute('data-always-visible-mobile');

        this.button.addEventListener('click', () => {
          this.mainButton.dataset.pdpTriggeredBySticky = 'true';
          this.mainButton.click();
          delete this.mainButton.dataset.pdpTriggeredBySticky;
        });

        this.updateVisibility = () => {
          const alwaysMobile = this.alwaysVisibleMobile && this.mobileQuery.matches;
          const mainButtonOffscreen = this.lastObserverEntry && !this.lastObserverEntry.isIntersecting;
          const visible = alwaysMobile || mainButtonOffscreen;
          this.classList.toggle('is-visible', visible);
          this.setAttribute('aria-hidden', String(!visible));
        };

        this.observer = new IntersectionObserver(([entry]) => {
          this.lastObserverEntry = entry;
          this.updateVisibility();
        });
        this.observer.observe(this.mainButton);
        this.mobileQuery.addEventListener('change', this.updateVisibility);
        this.updateVisibility();

        if (typeof subscribe !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
          this.variantChangeUnsubscriber = subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
            if (event.data.sectionId !== this.sectionId) return;
            this.syncFromMain(event.data.variant);
          });
        }
      }

      disconnectedCallback() {
        this.observer?.disconnect();
        this.mobileQuery?.removeEventListener('change', this.updateVisibility);
        this.variantChangeUnsubscriber?.();
      }

      syncFromMain(variant) {
        // product-info.js updates the main button and price before publishing
        // variantChange, so the main section is the source of truth here.
        this.button.toggleAttribute('disabled', this.mainButton.hasAttribute('disabled'));
        const mainLabel = this.mainButton.querySelector('span');
        const stickyLabel = this.button.querySelector('span');
        if (mainLabel && stickyLabel) stickyLabel.textContent = mainLabel.textContent.trim();
        if (variant && this.button.dataset.pdpCta !== undefined) {
          this.button.dataset.variantId = variant.id;
          this.button.dataset.price = variant.price;
        }

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
          if (variant.featured_media?.alt) this.image.alt = variant.featured_media.alt;
        }
      }
    }
  );
}
