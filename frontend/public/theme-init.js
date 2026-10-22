try {
  var themeDocument = document.documentElement;
  var themeStorage = localStorage;
  if (themeStorage.getItem("lang")) {
    themeStorage.removeItem("lang");
  }
  if (themeStorage.getItem("lw-theme") === "dark") {
    themeDocument.setAttribute("data-theme", "dark");
  }
  var accent = themeStorage.getItem("lw-accent");
  var pattern = themeStorage.getItem("lw-pattern");
  if (/^(ocean|forest|royal|slate)$/.test(accent)) {
    themeDocument.setAttribute("data-accent", accent);
  }
  if (/^(dots|lattice|waves)$/.test(pattern)) {
    themeDocument.setAttribute("data-pattern", pattern);
  }
} catch {}
