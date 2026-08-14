import axios from 'axios';

// Same origin: the Express app is mounted at /api by the Vercel rewrite in
// production, and by the Vite dev proxy locally.
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Inject Titulo: '[sumar]' into all POST and PATCH requests
    if (config.method === 'post' || config.method === 'patch') {
      if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
        config.data = {
          ...config.data,
          Titulo: '[sumar]',
          titulo: '[sumar]'
        };
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
