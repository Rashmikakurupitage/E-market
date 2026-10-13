// Lets phones install the website as an app ("Add to Home screen")
export default function manifest() {
  return {
    name: 'Lanka Women E-Market',
    short_name: 'Women E-Market',
    description: 'Shop authentic handicrafts, agri-products and textiles directly from women entrepreneurs across Sri Lanka.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fff5eb',
    theme_color: '#a3205f',
    categories: ['shopping', 'business'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Store', url: '/store', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'My account', url: '/account', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
