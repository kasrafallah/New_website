(() => {
  const root = document.documentElement;
  const storageKey = "kasra-site-theme";
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  function storedTheme() {
    try {
      const value = localStorage.getItem(storageKey);
      return value === "dark" || value === "light" ? value : null;
    } catch (_) {
      return null;
    }
  }

  function systemTheme() {
    return media.matches ? "dark" : "light";
  }

  function updateButton(theme) {
    const button = document.querySelector(".theme-toggle");
    if (!button) return;
    const dark = theme === "dark";
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    const icon = button.querySelector(".theme-toggle-icon");
    const label = button.querySelector(".theme-toggle-label");
    if (icon) icon.textContent = dark ? "☀" : "☾";
    if (label) label.textContent = dark ? "Light mode" : "Dark mode";
  }

  function applyTheme(theme, persist = false) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    updateButton(theme);
    if (persist) {
      try { localStorage.setItem(storageKey, theme); } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent("site-theme-change", {detail:{theme}}));
  }

  // Apply before the stylesheet paints to avoid a light-mode flash.
  applyTheme(storedTheme() || systemTheme());

  function mountToggle() {
    const nav = document.querySelector(".nav");
    if (!nav || document.querySelector(".theme-control")) return;

    const control = document.createElement("div");
    control.className = "theme-control";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.innerHTML =
      '<span class="theme-toggle-icon" aria-hidden="true"></span>' +
      '<span class="theme-toggle-label"></span>' +
      '<span class="theme-toggle-track" aria-hidden="true"><span></span></span>';

    button.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next, true);
    });

    control.appendChild(button);
    nav.insertAdjacentElement("afterend", control);
    updateButton(root.dataset.theme || systemTheme());

    requestAnimationFrame(() => root.classList.add("theme-transition-ready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountToggle, {once:true});
  } else {
    mountToggle();
  }

  const onSystemChange = () => {
    if (!storedTheme()) applyTheme(systemTheme());
  };
  if (media.addEventListener) media.addEventListener("change", onSystemChange);
  else if (media.addListener) media.addListener(onSystemChange);
})();