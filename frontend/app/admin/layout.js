// Admin pages: no links point here, and search engines are told not to list them.
// (Deliberately NOT listed in robots.txt, which anyone can read.)
// The real protection is on the backend: every /api/admin request is checked for an admin login.
export const metadata = {
  title: 'Admin | Lanka Women E-Market',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function AdminLayout({ children }) {
  return children;
}
