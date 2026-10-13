// Facebook Messenger chat links: m.me/shopname, messenger.com/t/shopname or a Facebook page link.
// Returns the cleaned https link, '' when empty, or null when it is not a Messenger/Facebook link.
const ALLOWED_HOSTS = new Set([
  'm.me', 'messenger.com', 'www.messenger.com',
  'facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com',
  'fb.me', 'fb.com', 'www.fb.com'
]);

function cleanMessengerUrl(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (text.length > 300 || /\s/.test(text)) return null;

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : 'https://' + text);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;
  if (url.pathname.replace(/\//g, '') === '' && !url.search) return null; // just the home page

  url.protocol = 'https:';
  return url.toString();
}

module.exports = { cleanMessengerUrl };
