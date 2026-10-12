import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/',
});

// Request interceptor for adding the auth token
api.interceptors.request.use(
  (config) => {
    const isClientContext =
      window.location.pathname.startsWith('/portal') ||
      window.location.pathname.startsWith('/client');
    const clientToken =
      localStorage.getItem('labClientToken') || localStorage.getItem('clientPortalToken');
    const adminToken = localStorage.getItem('adminToken');

    const token = isClientContext ? (clientToken || adminToken) : (adminToken || clientToken);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const isClientContext =
        window.location.pathname.startsWith('/portal') ||
        window.location.pathname.startsWith('/client');

      if (isClientContext) {
        localStorage.removeItem('labClientToken');
        localStorage.removeItem('clientPortalToken');
        if (window.location.pathname !== '/client/login') {
          window.location.assign('/client/login');
        }
      } else {
        localStorage.removeItem('adminToken');
        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
