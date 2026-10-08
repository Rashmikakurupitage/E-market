// Re-created on every page change, so each page fades in.
// Only opacity is animated: a transform here would shift pop-up dialogs while the page fades in.
export default function Template({ children }) {
  return <div className="flex flex-1 flex-col animate-page-in">{children}</div>;
}
