try {
  var themeDocument = document.documentElement;
  var themeStorage = localStorage;
  if (themeStorage.getItem("lang")) {
    themeStorage.removeItem("lang");
  }
  var savedTheme = themeStorage.getItem("lw-theme");
  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    themeDocument.setAttribute("data-theme", "dark");
    themeDocument.classList.add("dark");
  } else {
    themeDocument.removeAttribute("data-theme");
    themeDocument.classList.remove("dark");
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
