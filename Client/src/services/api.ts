import axios from 'axios';


const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const isStaging = import.meta.env.MODE === 'staging';

const API_BASE_URL = (() => {
  if (isStaging) {
    return import.meta.env.VITE_NGROK_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5500';
  }
  if (isBrowser && !isLocalhost) {
    
    return import.meta.env.VITE_NGROK_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || window.location.origin;
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5500';
})();


export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});


api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url ?? '';
      const isLogoutEndpoint = url.includes('/auth/logout');
      const isLoginEndpoint = url.includes('/auth/login');
      
      if (isLogoutEndpoint || isLoginEndpoint) {
        return Promise.reject(error);
      }
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { API_BASE_URL };
export default api;