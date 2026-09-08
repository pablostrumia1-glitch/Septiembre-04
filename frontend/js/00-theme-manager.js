(function (global) {
  "use strict";

  const LGMDM = (global.LGMDM = global.LGMDM || {});
  const STORAGE_KEY = "lgmdm-theme";
  const LEGACY_STORAGE_KEY = "base10-theme";

  const THEMES = Object.freeze({
    AUTO: "auto",
    NEON_STUDIO: "neon-studio",
    DARK: "dark",
    LIGHT: "light",
  });

  let currentTheme = THEMES.NEON_STUDIO;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  function storageGet(key) {
    try {
      return LGMDM.storage?.get?.(key) ?? localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      if (LGMDM.storage?.set) LGMDM.storage.set(key, value);
      else localStorage.setItem(key, value);
    } catch (_) {
      /* visual preference must never break the application */
    }
  }

  function getSavedTheme() {
    const modern = storageGet(STORAGE_KEY);
    if (modern && Object.values(THEMES).includes(modern)) return modern;
    const legacy = storageGet(LEGACY_STORAGE_KEY);
    if (legacy && Object.values(THEMES).includes(legacy)) return legacy;
    return THEMES.NEON_STUDIO;
  }

  function resolvedTheme(theme) {
    return theme === THEMES.AUTO ? (prefersDark.matches ? THEMES.DARK : THEMES.LIGHT) : theme;
  }

  function applyTheme(theme, { persist = true, announce = true } = {}) {
    if (!Object.values(THEMES).includes(theme)) {
      throw new Error(`LGMDM Theme Contract: unknown theme "${theme}"`);
    }

    currentTheme = theme;
    if (persist) storageSet(STORAGE_KEY, theme);

    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.classList.remove("theme-neon-studio", "theme-dark", "theme-light", "theme-auto");
    root.classList.add(`theme-${theme}`);

    const resolved = resolvedTheme(theme);
    root.dataset.themeResolved = resolved;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const colors = {
        "neon-studio": "#070812",
        dark: "#0d1117",
        light: "#f3f5f7",
      };
      meta.setAttribute("content", colors[resolved] || "#070812");
    }

    if (announce) {
      window.dispatchEvent(new CustomEvent("themechange", { detail: { theme, resolvedTheme: resolved } }));
    }
  }

  function toggleDarkMode() {
    const isDark = [THEMES.DARK, THEMES.NEON_STUDIO].includes(currentTheme);
    applyTheme(isDark ? THEMES.LIGHT : THEMES.NEON_STUDIO);
  }

  function setupListeners() {
    prefersDark.addEventListener("change", () => {
      if (currentTheme === THEMES.AUTO) applyTheme(THEMES.AUTO, { persist: false });
    });

    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        toggleDarkMode();
      }
    });
  }

  function init() {
    currentTheme = getSavedTheme();
    applyTheme(currentTheme, { persist: true, announce: false });
    setupListeners();

    const btn = document.getElementById("theme-switcher-btn");
    if (btn) {
      btn.addEventListener("click", () => toggleDarkMode());
      btn.title = "Alternar modo oscuro / claro";
      btn.setAttribute("aria-label", "Alternar modo oscuro / claro");
    }

    console.log(`🎨 LGMDM theme initialized: ${currentTheme}`);
  }

  const publicApi = { init, applyTheme, toggleDarkMode, currentTheme: () => currentTheme, themes: THEMES };
  LGMDM.themeManager = publicApi;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(window);
