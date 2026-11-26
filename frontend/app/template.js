// Re-created on every page change, so each page fades in.
// Browsers with view transitions use the smoother fade in SiteFrame instead (see motion.css).
// Only opacity is animated: a transform here would shift pop-up dialogs while the page fades in.
export default function Template({ children }) {
  return <div className="flex flex-1 flex-col animate-page-in page-fallback-fade">{children}</div>;
}
