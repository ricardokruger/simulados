"use strict";

const Temas = (() => {
  const options = [
    { id: "pixel", label: "Pixel art" },
    { id: "classico", label: "Clássico" },
  ];
  const storageKey = "mapa-de-estudos:tema";

  function initialize() {
    const control = document.querySelector("#theme-select");
    if (!control) return;
    const color = document.querySelector('meta[name="theme-color"]');
    let selected = options[0].id;
    try {
      const saved = localStorage.getItem(storageKey);
      if (options.some(theme => theme.id === saved)) selected = saved;
    } catch {}

    for (const theme of options) {
      const option = document.createElement("option");
      option.value = theme.id;
      option.textContent = theme.label;
      control.append(option);
    }
    control.value = selected;

    function apply() {
      const root = document.documentElement;
      root.dataset.theme = control.value;
      if (color) color.content = getComputedStyle(root).getPropertyValue("--page").trim();
    }

    apply();
    control.addEventListener("change", () => {
      apply();
      try {
        localStorage.setItem(storageKey, control.value);
      } catch {
        // The selected theme still works while this page is open.
      }
    });
    control.closest(".theme-picker").hidden = false;
  }

  return { initialize };
})();

Temas.initialize();
