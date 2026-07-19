(() => {
  const capture = (event, properties) => {
    const posthog = window.posthog;
    if (!posthog?.capture) return;
    if (typeof posthog.has_opted_out_capturing === 'function' && posthog.has_opted_out_capturing()) return;
    posthog.capture(event, properties);
  };

  document.addEventListener('click', (event) => {
    const cta = event.target.closest('[data-pdp-cta]');
    if (cta && !cta.disabled && cta.getAttribute('aria-disabled') !== 'true' && !cta.dataset.pdpTriggeredBySticky) {
      capture('pdp_cta_clicked', {
        placement: cta.dataset.placement,
        product_handle: cta.dataset.productHandle,
        variant_id: cta.dataset.variantId,
        price: Number(cta.dataset.price) / 100,
        currency: cta.dataset.currency,
        experience_version: cta.dataset.experienceVersion,
      });
    }

    const reassurance = event.target.closest('[data-pdp-reassurance]');
    const productInfo = reassurance?.closest('product-info');
    if (reassurance && productInfo) {
      capture('pdp_reassurance_opened', {
        type: reassurance.dataset.pdpReassurance,
        product_handle: productInfo.dataset.url?.split('/products/')[1]?.split('?')[0],
        experience_version: productInfo.dataset.experienceVersion,
      });
    }
  });

  document.addEventListener('pdp:gallery-viewed', (event) => capture('pdp_gallery_media_viewed', event.detail));
  document.addEventListener('pdp:bundle-added', (event) => capture('pdp_bundle_added', event.detail));
})();
