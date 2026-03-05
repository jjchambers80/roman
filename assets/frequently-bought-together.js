if (!customElements.get("frequently-bought-together")) {
  customElements.define(
    "frequently-bought-together",
    class FrequentlyBoughtTogether extends HTMLElement {
      constructor() {
        super();

        this.bundleButton = this.querySelector("[data-bundle-add]");
        this.errorWrapper = this.querySelector(
          ".frequently-bought-together__error",
        );
        this.cart =
          document.querySelector("cart-notification") ||
          document.querySelector("cart-drawer");

        if (this.bundleButton) {
          this.bundleButton.addEventListener(
            "click",
            this.onAddBundle.bind(this),
          );
        }
      }

      onAddBundle(evt) {
        evt.preventDefault();

        if (this.bundleButton.getAttribute("aria-disabled") === "true") return;

        this.handleError("");
        this.setLoading(true);

        const variantIds = JSON.parse(
          this.bundleButton.dataset.variantIds || "[]",
        );
        if (!variantIds.length) return this.setLoading(false);

        const items = variantIds.map((id) => ({ id: Number(id), quantity: 1 }));

        const body = { items };

        if (this.cart) {
          body.sections = this.cart
            .getSectionsToRender()
            .map((section) => section.id);
          body.sections_url = window.location.pathname;
          this.cart.setActiveElement(document.activeElement);
        }

        fetch(window.routes.cart_add_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/javascript",
          },
          body: JSON.stringify(body),
        })
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              // Error from Shopify (e.g. out of stock)
              publish(PUB_SUB_EVENTS.cartError, {
                source: "frequently-bought-together",
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleError(
                response.description ||
                  response.message ||
                  "Could not add items to cart.",
              );
              return;
            }

            if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            // Multi-item /cart/add.js returns { items: [...] } without a
            // top-level "key". CartNotification.renderContents expects
            // parsedState.key to build the product selector. Normalise by
            // using the last added item's key.
            if (response.items && !response.key) {
              response.key = response.items[response.items.length - 1].key;
            }

            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: "frequently-bought-together",
              cartData: response,
            });

            this.cart.renderContents(response);
          })
          .catch((e) => {
            console.error(e);
            this.handleError("Something went wrong. Please try again.");
          })
          .finally(() => {
            this.setLoading(false);
          });
      }

      setLoading(loading) {
        if (loading) {
          this.bundleButton.setAttribute("aria-disabled", "true");
          this.bundleButton.classList.add("loading");
          const spinner = this.bundleButton.querySelector(".loading__spinner");
          if (spinner) spinner.classList.remove("hidden");
        } else {
          this.bundleButton.removeAttribute("aria-disabled");
          this.bundleButton.classList.remove("loading");
          const spinner = this.bundleButton.querySelector(".loading__spinner");
          if (spinner) spinner.classList.add("hidden");
          if (this.cart && this.cart.classList.contains("is-empty")) {
            this.cart.classList.remove("is-empty");
          }
        }
      }

      handleError(message) {
        if (!this.errorWrapper) return;
        this.errorWrapper.textContent = message || "";
      }
    },
  );
}
