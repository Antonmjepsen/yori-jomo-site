/* ==========================================================
   Yori Jomo – nyhedsbrevs-popup
   - dukker op 2 sekunder efter siden er åbnet (fades ind)
   - baggrunden sløres (styres i css/index.css)
   - lukkes med krydset, med Escape eller ved klik uden for boksen
   ========================================================== */
(function () {
  "use strict";

  var SHOW_AFTER_MS = 2000;

  var modal = document.getElementById("newsletter-modal");
  if (!modal) return;

  var card = modal.querySelector(".newsletter-modal__card");
  var closeButton = modal.querySelector(".newsletter-modal__close");
  var form = modal.querySelector(".newsletter-modal__form");
  var previouslyFocused = null;

  function openModal() {
    previouslyFocused = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    card.focus({ preventScroll: true });
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus({ preventScroll: true });
    }
  }

  function isOpen() {
    return modal.classList.contains("is-open");
  }

  // Kryds
  closeButton.addEventListener("click", closeModal);

  // Klik på den slørede baggrund (ikke på selve boksen)
  modal.addEventListener("click", function (event) {
    if (event.target === modal) closeModal();
  });

  // Escape lukker, og Tab holdes inde i popup'en mens den er åben
  document.addEventListener("keydown", function (event) {
    if (!isOpen()) return;

    if (event.key === "Escape") {
      closeModal();
      return;
    }

    if (event.key === "Tab") {
      var focusable = card.querySelectorAll("button, input, a[href], [tabindex]:not([tabindex='-1'])");
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (event.shiftKey && (document.activeElement === first || document.activeElement === card)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Tilmelding: der er ikke noget sted at sende til endnu, så formularen
  // undgår bare at genindlæse siden og lukker popup'en.
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    closeModal();
    form.reset();
  });

  // Vis popup'en 2 sekunder efter siden er åbnet
  window.setTimeout(openModal, SHOW_AFTER_MS);
})();

/* ==========================================================
   Scroll-reveal
   Produkter, overskrifter, tekster og knapper fader ind og glider
   et par pixels op, første gang de kommer ind i billedet.
   Produkterne i en række kommer ét ad gangen (100 ms imellem), og
   overskrift, tekst og knap i About us/Retailers følger efter hinanden.
   Styles ligger i css/index.css under "SCROLL-REVEAL".
   ========================================================== */
(function () {
  "use strict";

  // Ingen animation for dem, der har bedt om mindre bevægelse, eller hvis
  // browseren ikke kan IntersectionObserver. Så vises alt bare som normalt.
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !("IntersectionObserver" in window)) return;

  function all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  var items = [];

  // Markerer elementerne og forskyder dem, så de kommer ét efter ét
  function prepare(elements, step) {
    elements.forEach(function (el, index) {
      el.classList.add("reveal");
      el.style.transitionDelay = index * step + "ms";
      items.push(el);
    });
  }

  prepare(all(".products--shoes .product"), 100);
  prepare(all(".products-cta .btn"), 0);
  prepare(all(".products--belts .product"), 100);
  all(".split__text").forEach(function (text) {
    prepare(all("h2, p, .btn", text), 150);
  });

  function show(el) {
    el.classList.add("is-visible");

    // Når animationen er færdig, fjernes klasserne igen, så senere
    // hover-effekter ikke arver den forsinkelse, der blev brugt her.
    el.addEventListener("transitionend", function cleanup(event) {
      if (event.target !== el || event.propertyName !== "opacity") return;
      el.classList.remove("reveal", "is-visible");
      el.style.transitionDelay = "";
      el.removeEventListener("transitionend", cleanup);
    });
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (entry.isIntersecting) {
          show(el);
          observer.unobserve(el);
        } else if (entry.boundingClientRect.bottom < 0) {
          // Allerede scrollet forbi (fx ved et link til #footer): vis med det samme
          el.style.transitionDelay = "0ms";
          show(el);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
  );

  items.forEach(function (el) {
    observer.observe(el);
  });

  // Sikkerhedsnet: springer man hurtigt forbi et element (fx med et link til
  // #footer eller Ctrl + End), melder observeren aldrig, at det var synligt,
  // og så bliver det stående usynligt. Her vises alt, der ligger over
  // vinduet, med det samme.
  var checking = false;

  function revealSkipped() {
    checking = false;
    items.forEach(function (el) {
      if (el.classList.contains("reveal") && !el.classList.contains("is-visible") && el.getBoundingClientRect().bottom < 0) {
        el.style.transitionDelay = "0ms";
        observer.unobserve(el);
        show(el);
      }
    });
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!checking) {
        checking = true;
        window.requestAnimationFrame(revealSkipped);
      }
    },
    { passive: true },
  );
})();

/* ==========================================================
   Mobilmenu (burger)
   Burger-knappen i menulinjen åbner menuen, som glider ind fra højre
   (animationen ligger i css/index.css under "MOBILMENU").
   Menuen lukkes med knappen i menuen, med Escape, ved tryk på et
   menupunkt, eller hvis vinduet bliver bredt nok til den almindelige menu.
   ========================================================== */
(function () {
  "use strict";

  var menu = document.getElementById("mobile-menu");
  var openButton = document.querySelector(".nav__burger");
  if (!menu || !openButton) return;

  var closeButton = menu.querySelector(".mobile-menu__close");
  var links = menu.querySelectorAll("a");

  function isOpen() {
    return menu.classList.contains("is-open");
  }

  function openMenu() {
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    openButton.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
    closeButton.focus({ preventScroll: true });
  }

  function closeMenu(restoreFocus) {
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    openButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
    if (restoreFocus) openButton.focus({ preventScroll: true });
  }

  openButton.addEventListener("click", openMenu);

  closeButton.addEventListener("click", function () {
    closeMenu(true);
  });

  // Tryk på et menupunkt: luk menuen, og lad browseren scrolle til sektionen
  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener("click", function () {
      closeMenu(false);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (!isOpen()) return;

    if (event.key === "Escape") {
      closeMenu(true);
      return;
    }

    // Tab holdes inde i menuen, mens den er åben
    if (event.key === "Tab") {
      var first = closeButton;
      var last = links[links.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Bliver vinduet bredt nok til den almindelige menu, lukkes mobilmenuen
  var desktopQuery = window.matchMedia("(min-width: 750px)");
  function onResize(event) {
    if (event.matches && isOpen()) closeMenu(false);
  }
  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener("change", onResize);
  } else if (desktopQuery.addListener) {
    desktopQuery.addListener(onResize);
  }
})();
