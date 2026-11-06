import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/auth/sign-in";
      }
    } else if (error.response?.status === 403) {
      if (typeof window !== "undefined") {
        window.location.href = "/unauthorized";
      }
    }
    return Promise.reject(error);
  },
);
