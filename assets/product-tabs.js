if (!customElements.get("product-tabs")) {
  customElements.define(
    "product-tabs",
    class ProductTabs extends HTMLElement {
      constructor() {
        super();
        this.buttons = this.querySelectorAll('[role="tab"]');
        this.panels = this.querySelectorAll('[role="tabpanel"]');
        this.bindEvents();
      }

      bindEvents() {
        this.buttons.forEach((button) => {
          button.addEventListener("click", this.onTabClick.bind(this));
          button.addEventListener("keydown", this.onKeyDown.bind(this));
        });
      }

      onTabClick(evt) {
        this.switchTab(evt.currentTarget);
      }

      onKeyDown(evt) {
        const index = Array.from(this.buttons).indexOf(evt.currentTarget);
        let newIndex;

        if (evt.key === "ArrowRight") {
          newIndex = (index + 1) % this.buttons.length;
        } else if (evt.key === "ArrowLeft") {
          newIndex = (index - 1 + this.buttons.length) % this.buttons.length;
        } else if (evt.key === "Home") {
          newIndex = 0;
        } else if (evt.key === "End") {
          newIndex = this.buttons.length - 1;
        } else {
          return;
        }

        evt.preventDefault();
        this.switchTab(this.buttons[newIndex]);
        this.buttons[newIndex].focus();
      }

      switchTab(selectedButton) {
        const targetPanel = selectedButton.getAttribute("aria-controls");

        this.buttons.forEach((button) => {
          button.setAttribute("aria-selected", "false");
          button.setAttribute("tabindex", "-1");
        });

        this.panels.forEach((panel) => {
          panel.setAttribute("aria-hidden", "true");
        });

        selectedButton.setAttribute("aria-selected", "true");
        selectedButton.setAttribute("tabindex", "0");
        this.querySelector(`#${targetPanel}`).setAttribute(
          "aria-hidden",
          "false",
        );
      }
    },
  );
}
