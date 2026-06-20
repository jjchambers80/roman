/**
 * Build Your Own Bundle controller.
 * Tracks selected items client-side only; nothing hits the network until
 * CONTINUE, which batches a single /cart/add.js call then redirects through
 * the matching tier's discount-code auto-apply URL (/discount/<code>).
 */
const TIERS = [
  { min: 5, code: 'BUNDLE25', pct: 25 },
  { min: 4, code: 'BUNDLE20', pct: 20 },
  { min: 3, code: 'BUNDLE15', pct: 15 },
];

class BundleBuilder extends HTMLElement {
  constructor() {
    super();
    this.cartObject = []; // { variantId, price, title, image }
  }

  connectedCallback() {
    this.items = Array.from(this.querySelectorAll('[data-bundle-item]'));
    this.progressFill = this.querySelector('[data-bundle-progress-fill]');
    this.progressText = this.querySelector('[data-bundle-progress-text]');
    this.lineItemsEl = this.querySelector('[data-bundle-line-items]');
    this.summaryEl = this.querySelector('[data-bundle-summary]');
    this.continueBtn = this.querySelector('[data-bundle-continue]');

    this.items.forEach((item) => {
      const incrementBtn = item.querySelector('[data-bundle-increment]');
      const decrementBtn = item.querySelector('[data-bundle-decrement]');
      incrementBtn.addEventListener('click', () => this.addItem(item));
      decrementBtn.addEventListener('click', () => this.removeItem(item));
    });

    this.continueBtn.addEventListener('click', () => this.checkout());

    this.render();
  }

  addItem(itemEl) {
    this.cartObject.push({
      variantId: itemEl.dataset.variantId,
      price: parseFloat(itemEl.dataset.price),
      title: itemEl.dataset.title,
      image: itemEl.dataset.image,
    });
    this.bumpQty(itemEl, 1);
    this.render();
  }

  removeItem(itemEl) {
    const variantId = itemEl.dataset.variantId;
    const index = this.cartObject.findIndex((i) => i.variantId === variantId);
    if (index === -1) return;
    this.cartObject.splice(index, 1);
    this.bumpQty(itemEl, -1);
    this.render();
  }

  bumpQty(itemEl, delta) {
    const qtyEl = itemEl.querySelector('[data-bundle-qty]');
    const next = Math.max(0, parseInt(qtyEl.textContent, 10) + delta);
    qtyEl.textContent = next;
  }

  currentTier() {
    const n = this.cartObject.length;
    return TIERS.find((tier) => n >= tier.min) || null;
  }

  nextTier() {
    const n = this.cartObject.length;
    const ascending = [...TIERS].reverse(); // 15, 20, 25
    return ascending.find((tier) => n < tier.min) || null;
  }

  render() {
    const n = this.cartObject.length;
    const tier = this.currentTier();
    const next = this.nextTier();

    const pct = Math.min(n, 5) / 5 * 100;
    this.progressFill.style.width = `${pct}%`;

    if (next) {
      const remaining = next.min - n;
      if (n === 0) {
        this.progressText.textContent = this.dataset.progressZero;
      } else if (remaining === 1) {
        this.progressText.textContent = this.dataset.progressOneMoreTemplate.replace(
          '__PERCENT__',
          next.pct,
        );
      } else {
        this.progressText.textContent = this.dataset.progressMoreTemplate
          .replace('__COUNT__', remaining)
          .replace('__PERCENT__', next.pct);
      }
    } else if (tier) {
      this.progressText.textContent = this.dataset.progressUnlockedTemplate.replace(
        '__PERCENT__',
        tier.pct,
      );
    }

    this.summaryEl.hidden = n === 0;
    this.lineItemsEl.replaceChildren(
      ...this.cartObject.map((item) => {
        const li = document.createElement('li');
        li.className = 'bundle-builder__line-item';
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = '';
        img.width = 48;
        img.height = 48;
        const span = document.createElement('span');
        span.textContent = item.title;
        li.append(img, span);
        return li;
      }),
    );

    this.continueBtn.disabled = n === 0;
    this.continueBtn.textContent = this.dataset.continueTemplate.replace('__COUNT__', n);
  }

  async checkout() {
    const tier = this.currentTier();
    const items = {};
    this.cartObject.forEach((item) => {
      items[item.variantId] = (items[item.variantId] || 0) + 1;
    });

    this.continueBtn.disabled = true;
    this.continueBtn.textContent = this.dataset.addingToCart;

    await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: Object.entries(items).map(([id, quantity]) => ({ id, quantity })),
      }),
    });

    if (tier) {
      // /cart/update.js writes discount into the cart's persistent
      // discount_codes field, unlike the legacy /discount/<code> permalink
      // (which only attaches to a transient checkout session and is lost
      // once the customer leaves the redirected page).
      await fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discount: tier.code }),
      });
    }

    window.location.href = '/cart';
  }
}

customElements.define('bundle-builder', BundleBuilder);
