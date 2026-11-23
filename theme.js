(() => {
  "use strict";

  const root = document.documentElement;

  try {
    if (localStorage.getItem("theme") === "light") {
      root.dataset.theme = "light";
    }
  } catch {
    // The theme still works when storage is unavailable; it simply is not saved.
  }

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("theme-toggle");
    const themeColor = document.getElementById("theme-color");

    if (!button) {
      return;
    }

    const updateTheme = (theme) => {
      const isLight = theme === "light";
      root.dataset.theme = theme;
      button.textContent = isLight ? "Dark mode" : "Light mode";
      button.setAttribute(
        "aria-label",
        "Switch to " + (isLight ? "dark" : "light") + " mode",
      );

      if (themeColor) {
        themeColor.content = isLight ? "#ffffff" : "#000000";
      }
    };

    updateTheme(root.dataset.theme);

    button.addEventListener("click", () => {
      const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";

      try {
        localStorage.setItem("theme", nextTheme);
      } catch {
        // Keep the in-page toggle functional even if storage is unavailable.
      }

      updateTheme(nextTheme);
    });
  });
})();
