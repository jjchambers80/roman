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

const TIERS_ASCENDING = [...TIERS].reverse();
const MAX_VISIBLE_ITEMS = TIERS[0].min;

class BundleBuilder extends HTMLElement {
  constructor() {
    super();
    this.cartObject = []; // { variantId, price, compareAtPrice, title, variantTitle, image }
  }

  connectedCallback() {
    this.items = Array.from(this.querySelectorAll('[data-bundle-item]'));
    this.progressFill = this.querySelector('[data-bundle-progress-fill]');
    this.progressText = this.querySelector('[data-bundle-progress-text]');
    this.statusTitle = this.querySelector('[data-bundle-status-title]');
    this.lineItemsEl = this.querySelector('[data-bundle-line-items]');
    this.continueBtn = this.querySelector('[data-bundle-continue]');
    this.continueLabel = this.querySelector('[data-bundle-continue-label]');
    this.continuePrices = this.querySelector('[data-bundle-continue-prices]');
    this.tierMarkers = Array.from(this.querySelectorAll('[data-bundle-tier-marker]'));

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
      price: Number(itemEl.dataset.price),
      compareAtPrice: Number(itemEl.dataset.compareAtPrice),
      title: itemEl.dataset.title,
      variantTitle: itemEl.dataset.variantTitle,
      image: itemEl.dataset.image,
    });
    this.bumpQty(itemEl, 1);
    this.render();
  }

  removeItem(itemEl) {
    const index = this.findCartIndexByVariant(itemEl.dataset.variantId);
    if (index === -1) return;
    this.cartObject.splice(index, 1);
    this.bumpQty(itemEl, -1);
    this.render();
  }

  removeCartIndex(index) {
    const [removed] = this.cartObject.splice(index, 1);
    if (!removed) return;

    const itemEl = this.items.find((item) => item.dataset.variantId === removed.variantId);
    if (itemEl) this.bumpQty(itemEl, -1);

    this.render();
  }

  findCartIndexByVariant(variantId) {
    for (let index = this.cartObject.length - 1; index >= 0; index -= 1) {
      if (this.cartObject[index].variantId === variantId) return index;
    }

    return -1;
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
    return TIERS_ASCENDING.find((tier) => n < tier.min) || null;
  }

  render() {
    const n = this.cartObject.length;
    const tier = this.currentTier();
    const next = this.nextTier();
    const progressPct = Math.min(n, MAX_VISIBLE_ITEMS) / MAX_VISIBLE_ITEMS * 100;

    this.progressFill.style.width = `${progressPct}%`;
    this.progressText.textContent = this.progressMessage(n, tier, next);
    this.statusTitle.textContent = this.statusMessage(n, tier, next);

    this.tierMarkers.forEach((marker) => {
      marker.classList.toggle('is-active', n >= Number(marker.dataset.min));
    });

    this.renderLineItems(tier);
    this.renderContinue(n, tier);
  }

  progressMessage(n, tier, next) {
    if (next) {
      const remaining = next.min - n;
      if (n === 0) return this.dataset.progressZero;
      if (remaining === 1) {
        return this.dataset.progressOneMoreTemplate.replace('__PERCENT__', next.pct);
      }

      return this.dataset.progressMoreTemplate
        .replace('__COUNT__', remaining)
        .replace('__PERCENT__', next.pct);
    }

    if (tier) {
      return this.dataset.progressUnlockedTemplate.replace('__PERCENT__', tier.pct);
    }

    return '';
  }

  statusMessage(n, tier, next) {
    if (tier && !next) return this.dataset.previewCompleteTitle;
    if (tier) {
      return this.dataset.progressUnlockedTemplate.replace('__PERCENT__', tier.pct);
    }
    if (n > 0) return this.dataset.previewActiveTitle;

    return this.dataset.previewStartTitle;
  }

  renderLineItems(tier) {
    const selectedRows = this.cartObject.map((item, index) => this.createSelectedRow(item, index, tier));
    const emptyRows = [];
    const emptyCount = Math.max(0, MAX_VISIBLE_ITEMS - this.cartObject.length);

    for (let index = 0; index < emptyCount; index += 1) {
      emptyRows.push(this.createPlaceholderRow(this.cartObject.length + index + 1));
    }

    this.lineItemsEl.replaceChildren(...selectedRows, ...emptyRows);
    this.lineItemsEl.dataset.bundleCount = this.cartObject.length;
  }

  createSelectedRow(item, index, tier) {
    const li = document.createElement('li');
    li.className = 'bundle-builder__line-item bundle-builder__line-item--selected';
    li.dataset.slot = index + 1;

    const media = document.createElement('div');
    media.className = 'bundle-builder__line-media';

    if (item.image) {
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = '';
      img.width = 72;
      img.height = 72;
      media.append(img);
    } else {
      media.append(this.createPlaceholderBottle());
    }

    const body = document.createElement('div');
    body.className = 'bundle-builder__line-body';

    const eyebrow = this.createLineEyebrow(this.dataset.previewSelectedEyebrow);

    const title = document.createElement('p');
    title.className = 'bundle-builder__line-title';
    title.textContent = item.title;
    body.append(eyebrow, title);

    if (item.variantTitle) {
      const variantTitle = document.createElement('p');
      variantTitle.className = 'bundle-builder__line-variant';
      variantTitle.textContent = item.variantTitle;
      body.append(variantTitle);
    }

    body.append(this.createPriceRow(item, tier));

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'bundle-builder__line-remove';
    removeBtn.setAttribute('aria-label', `${this.dataset.removeLabel} ${item.title}`);
    removeBtn.textContent = 'x';
    removeBtn.addEventListener('click', () => this.removeCartIndex(index));

    li.append(media, body, removeBtn);
    return li;
  }

  createPlaceholderRow(slotNumber) {
    const li = document.createElement('li');
    li.className = 'bundle-builder__line-item bundle-builder__line-item--placeholder';
    li.dataset.slot = slotNumber;
    li.setAttribute('aria-hidden', 'true');

    const media = document.createElement('div');
    media.className = 'bundle-builder__line-media';
    media.append(this.createPlaceholderBottle());

    const body = document.createElement('div');
    body.className = 'bundle-builder__line-body';

    const eyebrow = this.createLineEyebrow(
      this.dataset.previewEmptyEyebrowTemplate.replace('__SLOT__', slotNumber),
    );

    const title = document.createElement('p');
    title.className = 'bundle-builder__line-title';
    title.textContent = this.dataset.previewEmptyTitle;

    const subtitle = document.createElement('p');
    subtitle.className = 'bundle-builder__line-placeholder-copy';
    subtitle.textContent = this.placeholderCopy(slotNumber);

    body.append(eyebrow, title, subtitle);
    li.append(media, body);
    return li;
  }

  createLineEyebrow(text) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'bundle-builder__line-eyebrow';
    eyebrow.textContent = text;

    return eyebrow;
  }

  createPlaceholderBottle() {
    const placeholder = document.createElement('span');
    placeholder.className = 'bundle-builder__placeholder-bottle';
    placeholder.setAttribute('aria-hidden', 'true');

    return placeholder;
  }

  createPriceRow(item, tier) {
    const row = document.createElement('p');
    row.className = 'bundle-builder__line-price';
    const discounted = tier ? this.discountedPrice(item.price, tier) : item.price;

    if (tier && discounted < item.price) {
      row.append(this.createComparePrice(item.price), this.createCurrentPrice(discounted));
      return row;
    }

    if (item.compareAtPrice > item.price) {
      row.append(this.createComparePrice(item.compareAtPrice), this.createCurrentPrice(item.price));
      return row;
    }

    row.append(this.createCurrentPrice(item.price));
    return row;
  }

  createComparePrice(cents) {
    const compare = document.createElement('s');
    compare.textContent = this.formatMoney(cents);
    return compare;
  }

  createCurrentPrice(cents) {
    const price = document.createElement('span');
    price.textContent = this.formatMoney(cents);
    return price;
  }

  placeholderCopy(slotNumber) {
    const tier = TIERS_ASCENDING.find((tierEntry) => tierEntry.min === slotNumber);
    if (tier) {
      const template = tier.min === MAX_VISIBLE_ITEMS
        ? this.dataset.previewBestTemplate
        : this.dataset.previewUnlockTemplate;

      return template.replace('__PERCENT__', tier.pct);
    }
    if (slotNumber === 1) return this.dataset.previewSlotCopy || this.dataset.previewEmptySubtitle;

    return this.dataset.previewNextSlotCopy;
  }

  renderContinue(n, tier) {
    const total = this.cartObject.reduce((sum, item) => sum + item.price, 0);
    const discounted = tier ? this.discountedPrice(total, tier) : total;

    this.continueBtn.disabled = n === 0;
    this.continueBtn.setAttribute(
      'aria-label',
      n === 0 ? this.dataset.progressZero : this.dataset.continueTemplate.replace('__COUNT__', n),
    );
    this.continueLabel.textContent = 'Continue';
    this.continuePrices.replaceChildren();

    if (n === 0) return;

    if (discounted < total) {
      this.continuePrices.append(this.createComparePrice(total), this.createCurrentPrice(discounted));
      return;
    }

    this.continuePrices.append(this.createCurrentPrice(total));
  }

  discountedPrice(cents, tier) {
    return Math.round(cents * (100 - tier.pct) / 100);
  }

  formatMoney(cents) {
    const locale = document.documentElement.lang || 'en-US';
    const currency = window.Shopify?.currency?.active || 'USD';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  }

  async checkout() {
    const tier = this.currentTier();
    const items = {};
    this.cartObject.forEach((item) => {
      items[item.variantId] = (items[item.variantId] || 0) + 1;
    });

    this.continueBtn.disabled = true;
    this.continueLabel.textContent = this.dataset.addingToCart;
    this.continuePrices.replaceChildren();

    await fetch(window.routes?.cart_add_url || '/cart/add.js', {
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
      await fetch(window.routes?.cart_update_url || '/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discount: tier.code }),
      });
    }

    window.location.href = window.routes?.cart_url || '/cart';
  }
}

customElements.define('bundle-builder', BundleBuilder);
