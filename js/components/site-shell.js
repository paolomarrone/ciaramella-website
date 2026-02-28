class SiteNav extends HTMLElement {
  connectedCallback() {
    const currentPage = this.getAttribute("current-page") || "";
    const isActive = (page) => (page === currentPage ? " is-active" : "");

    this.innerHTML = `
      <nav class="navbar is-dark site-navbar" role="navigation" aria-label="main navigation">
        <div class="container">
          <div class="navbar-brand">
            <a class="navbar-item site-brand" href="index.html" aria-label="Ciaramella home">
              <img class="site-brand-logo" src="assets/images/logo.svg" width="80" height="28" alt="Ciaramella logo">
              <span class="title is-4 has-text-light site-brand-title">Ciaramella</span>
            </a>
            <button
              type="button"
              class="navbar-burger"
              aria-label="menu"
              aria-expanded="false"
              data-target="site-nav-menu"
            >
              <span aria-hidden="true"></span>
              <span aria-hidden="true"></span>
              <span aria-hidden="true"></span>
            </button>
          </div>

          <div id="site-nav-menu" class="navbar-menu">
            <div class="navbar-start"></div>
            <div class="navbar-end">
              <a class="navbar-item${isActive("home")}" href="index.html">Home</a>
              <a class="navbar-item${isActive("papers")}" href="papers.html">Papers</a>
              <a class="navbar-item is-external" href="https://github.com/paolomarrone/Zampogna" target="_blank" rel="noreferrer">
                <span>Source</span>
                <span class="external-link-mark" aria-hidden="true">↗</span>
              </a>
              <a class="navbar-item${isActive("webide")}" href="webide.html">Web Playground</a>
            </div>
          </div>
        </div>
      </nav>
    `;

    const burger = this.querySelector(".navbar-burger");
    const menu = this.querySelector("#site-nav-menu");
    const menuItems = this.querySelectorAll(".navbar-item");

    if (!burger || !menu) {
      return;
    }

    const closeMenu = () => {
      burger.classList.remove("is-active");
      menu.classList.remove("is-active");
      burger.setAttribute("aria-expanded", "false");
    };

    burger.addEventListener("click", () => {
      const isOpen = burger.classList.toggle("is-active");
      menu.classList.toggle("is-active", isOpen);
      burger.setAttribute("aria-expanded", String(isOpen));
    });

    menuItems.forEach((item) => {
      item.addEventListener("click", () => {
        if (window.matchMedia("(max-width: 1023px)").matches) {
          closeMenu();
        }
      });
    });
  }
}

class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="footer site-footer">
        <div class="content has-text-centered">
          <p>
            <strong>Ciaramella</strong> by <a href="https://orastron.com/" target="_blank" rel="noreferrer">Orastron</a>.
            The source code is licensed <a href="https://www.isc.org/licenses/" target="_blank" rel="noreferrer">ISC</a>.
            The website content is licensed <a href="https://www.isc.org/licenses/" target="_blank" rel="noreferrer">ISC</a>.
          </p>
        </div>
      </footer>
    `;
  }
}

async function copyText(value) {
  if (!value) {
    return false;
  }

  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(value);
    return true;
  }

  const helper = document.createElement("textarea");
  helper.value = value;
  helper.setAttribute("readonly", "");
  helper.style.position = "absolute";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(helper);
  }
}

function initCopyActions() {
  const copyButtons = document.querySelectorAll("[data-copy-text]");

  copyButtons.forEach((button) => {
    let resetTimer = null;

    button.addEventListener("click", async () => {
      const copyValue = button.getAttribute("data-copy-text") || "";
      const code = button.querySelector("code");
      const previousLabel = code ? code.textContent : "";

      try {
        const copied = await copyText(copyValue);
        if (!copied) {
          return;
        }
      } catch (error) {
        return;
      }

      button.classList.add("is-copied");

      if (code) {
        code.textContent = "Copied";
      }

      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        button.classList.remove("is-copied");
        if (code) {
          code.textContent = previousLabel;
        }
      }, 1400);
    });
  });
}

customElements.define("site-nav", SiteNav);
customElements.define("site-footer", SiteFooter);
initCopyActions();
