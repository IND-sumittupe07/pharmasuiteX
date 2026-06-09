import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "https://pharmasuitex-api.onrender.com/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pharmasuitex_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("pharmasuitex_token");
      localStorage.removeItem("pharmasuitex_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
