import axios from 'axios';

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

let csrfToken = null;
let csrfRequest = null;

const isSafeMethod = (method) => ['get', 'head', 'options'].includes((method || 'get').toLowerCase());

async function getCsrfToken() {
  if (!csrfRequest) {
    csrfRequest = API.get('/auth/csrf')
      .then((response) => {
        if (typeof response.data.csrfToken !== 'string') {
          throw new Error('The server did not provide a CSRF token.');
        }
        csrfToken = response.data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfRequest = null;
      });
  }
  return csrfRequest;
}

API.interceptors.request.use(async (req) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    if (!isSafeMethod(req.method)) {
      const token = csrfToken || await getCsrfToken();
      req.headers['X-CSRF-Token'] = token;
    }
  }
  return req;
});

API.interceptors.response.use((response) => {
  if (response.config.url?.endsWith('/auth/logout')) csrfToken = null;
  return response;
}, async (error) => {
  const request = error.config;
  if (error.response?.data?.code === 'CSRF_INVALID' && request && !request._csrfRetry) {
    request._csrfRetry = true;
    csrfToken = null;
    try {
      const token = await getCsrfToken();
      request.headers['X-CSRF-Token'] = token;
      return API.request(request);
    } catch {
      return Promise.reject(error);
    }
  }
  return Promise.reject(error);
});

export function clearCsrfToken() {
  csrfToken = null;
}

export default API;
