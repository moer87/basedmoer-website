(function () {

  const currentPath =
    window.location.pathname;

  function active(path) {
    if (path === "/") {
      return currentPath === "/" ? "active" : "";
    }

    return currentPath.startsWith(path)
      ? "active"
      : "";
  }

  const header = `

    <header class="site-header">

      <div class="container site-nav-shell">

        <a
          class="site-brand"
          href="/"
          aria-label="Based Moer Home"
        >

          <img
            src="/assets/based-moer-logo.jpg"
            alt="Based Moer logo"
          >

          <span class="site-brand-name">
            BASED MOER
          </span>

        </a>

        <nav
          class="site-desktop-nav"
          aria-label="Main navigation"
        >

          <a
            href="/"
            class="${active("/")}"
          >
            Home
          </a>

          <a
            href="/moerverse/"
            class="${active("/moerverse/")}"
          >
            Moerverse
          </a>

          <a
            href="/live/"
            class="${active("/live/")}"
          >
            Live
          </a>

          <a
            href="/academy/"
            class="${active("/academy/")}"
          >
            Academy
          </a>

          <a
            href="/generator/"
            class="${active("/generator/")}"
          >
            Generator
          </a>

          <a href="/#explore">
            Explore
          </a>

        </nav>

        <a
          class="site-follow"
          href="https://x.com/basedmoer"
          target="_blank"
          rel="noopener noreferrer"
        >

          <svg
            class="site-x-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >

            <path
              d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817-5.967 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"
            />

          </svg>

          FOLLOW

        </a>

        <button
          class="site-mobile-toggle"
          id="siteMobileToggle"
          aria-label="Open menu"
        >
          ☰
        </button>

      </div>

      <div
        class="container site-mobile-menu"
        id="siteMobileMenu"
      >

        <a href="/">
          Home
        </a>

        <a href="/moerverse/">
          Moerverse
        </a>

        <a href="/live/">
          Live
        </a>

        <a href="/academy/">
          Academy
        </a>

        <a href="/generator/">
          Generator
        </a>

        <a href="/#explore">
          Explore
        </a>

        <a
          class="site-mobile-follow"
          href="https://x.com/basedmoer"
          target="_blank"
          rel="noopener noreferrer"
        >
          Follow on X ↗
        </a>

      </div>

    </header>

  `;

  const footer = `

    <footer class="site-footer">

      <div class="container">

        <div class="footer-grid">

          <div>

            <div class="footer-brand">

              <img
                src="/assets/based-moer-logo.jpg"
                alt="Based Moer"
              >

              <strong>
                BASED MOER
              </strong>

            </div>

            <div class="footer-copy">

              Pixel-first • Built on Base

              <br><br>

              Original pixel art,
              Moe AI market intelligence,
              education
              and creator-built onchain experiences.

            </div>

          </div>

          <div class="footer-column">

            <h4>
              Explore
            </h4>

            <a href="/moerverse/">
              Moerverse
            </a>

            <a href="/live/">
              Live Engine
            </a>

            <a href="/academy/">
              Moe Academy
            </a>

            <a href="/generator/">
              Art Generator
            </a>

          </div>

          <div class="footer-column">

            <h4>
              Community
            </h4>

            <a
              href="https://x.com/basedmoer"
              target="_blank"
              rel="noopener noreferrer"
            >
              X
            </a>

            <a
              href="https://discord.gg/B6Pu9fARTX"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord
            </a>

            <a
              href="https://www.youtube.com/@BasedMoer"
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube
            </a>

            <a
              href="https://basedmoer.gitbook.io/based-moer"
              target="_blank"
              rel="noopener noreferrer"
            >
              Docs
            </a>

          </div>

        </div>

        <div class="footer-bottom">

          <span>
            © 2026 Based Moer. Stay Based.
          </span>

          <div class="footer-disclaimer">

            Based Moer is an independent creator project.
            Moe AI and Moe Academy provide experimental
            market-analysis and educational information only.
            Nothing on BasedMoer.com constitutes financial,
            investment or trading advice.

          </div>

        </div>

      </div>

    </footer>

  `;

  const headerTarget =
    document.getElementById(
      "globalHeader"
    );

  const footerTarget =
    document.getElementById(
      "globalFooter"
    );

  if (headerTarget) {
    headerTarget.innerHTML =
      header;
  }

  if (footerTarget) {
    footerTarget.innerHTML =
      footer;
  }

  const toggle =
    document.getElementById(
      "siteMobileToggle"
    );

  const menu =
    document.getElementById(
      "siteMobileMenu"
    );

  if (toggle && menu) {

    toggle.addEventListener(
      "click",
      () => {

        menu.classList.toggle(
          "open"
        );

        toggle.textContent =
          menu.classList.contains(
            "open"
          )
          ? "✕"
          : "☰";

      }
    );

  }

})();
