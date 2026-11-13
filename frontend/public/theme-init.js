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
  themeStorage.removeItem("lw-accent");
  themeStorage.removeItem("lw-pattern");
  themeDocument.removeAttribute("data-accent");
  themeDocument.removeAttribute("data-pattern");
} catch {}
