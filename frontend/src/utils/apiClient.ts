import axios from "axios";
import {
  isUnauthenticatedError,
  redirectToLogin,
} from "utils/sessionExpiry";

const apiClient = axios.create({
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Guest session checks (login / public pages) must not bounce to login.
    // AuthProvider + RequireAuth handle /users/current. Other 401s mean the
    // in-memory session dropped while the user was using the app.
    const url = String(error?.config?.url ?? "");
    if (!url.includes("users/current") && isUnauthenticatedError(error)) {
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
