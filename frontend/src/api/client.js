import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "https://pharmasuitex.onrender.com/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("medtrack_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 - redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("medtrack_token");
      localStorage.removeItem("medtrack_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
