import axios from 'axios';

/**
 * Pre-configured axios instance.
 * In dev: VITE_API_BASE_URL is empty, so requests go to the Vite proxy.
 * In prod: VITE_API_BASE_URL points to the backend Cloud Run URL.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
});

export default api;
