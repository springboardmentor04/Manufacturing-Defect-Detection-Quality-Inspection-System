import axios from "axios";

/*
 * ============================================================
 * VISIONINSPECT AI - CENTRAL API CLIENT
 * ============================================================
 *
 * Development:
 *   Uses VITE_API_URL when available.
 *
 *   If VITE_API_URL is not configured, the development backend
 *   defaults to:
 *
 *   http://127.0.0.1:8000
 *
 * Production:
 *   Configure:
 *
 *   VITE_API_URL=https://your-backend-domain.com
 *
 * Every authenticated frontend API request should use this
 * Axios instance instead of creating its own axios/fetch client.
 * ============================================================
 */

const DEFAULT_API_URL = "http://127.0.0.1:8000";

/*
 * Vite exposes frontend environment variables through
 * import.meta.env.
 */
const configuredApiUrl =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_URL
        ? String(import.meta.env.VITE_API_URL).trim()
        : "";

const API_URL = (
    configuredApiUrl || DEFAULT_API_URL
).replace(/\/+$/, "");

/*
 * ============================================================
 * AUTH STORAGE KEYS
 * ============================================================
 */

const TOKEN_KEY = "visioninspect_access_token";
const USER_KEY = "visioninspect_user";
const ROLE_KEY = "visioninspect_role";

/*
 * Temporary compatibility keys.
 *
 * Older versions of the frontend may still have these values
 * stored in localStorage.
 */
const LEGACY_TOKEN_KEY = "token";
const LEGACY_USER_KEY = "user";
const LEGACY_ROLE_KEY = "role";

/*
 * ============================================================
 * AXIOS INSTANCE
 * ============================================================
 */

const api = axios.create({
    baseURL: API_URL,
    timeout: 60000,

    headers: {
        Accept: "application/json",
    },
});

/*
 * ============================================================
 * REQUEST INTERCEPTOR
 * ============================================================
 *
 * Automatically attaches the current JWT.
 *
 * Pages should NOT manually create:
 *
 * Authorization: Bearer ...
 *
 * anymore.
 */

api.interceptors.request.use(
    (config) => {
        let token = null;

        try {
            token =
                localStorage.getItem(TOKEN_KEY) ||
                localStorage.getItem(
                    LEGACY_TOKEN_KEY
                );
        } catch (error) {
            console.error(
                "Unable to read authentication token:",
                error
            );
        }

        if (token) {
            config.headers =
                config.headers || {};

            config.headers.Authorization =
                `Bearer ${token}`;
        }

        config.headers =
            config.headers || {};

        config.headers.Accept =
            "application/json";

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);

/*
 * ============================================================
 * RESPONSE INTERCEPTOR
 * ============================================================
 *
 * If the backend returns 401, the current authentication
 * session is invalid/expired.
 *
 * Clear both the current and legacy auth keys so the existing
 * protected-route logic can redirect the user to login.
 */

api.interceptors.response.use(
    (response) => {
        return response;
    },

    (error) => {
        if (
            error.response?.status === 401
        ) {
            try {
                localStorage.removeItem(
                    TOKEN_KEY
                );

                localStorage.removeItem(
                    LEGACY_TOKEN_KEY
                );

                localStorage.removeItem(
                    USER_KEY
                );

                localStorage.removeItem(
                    LEGACY_USER_KEY
                );

                localStorage.removeItem(
                    ROLE_KEY
                );

                localStorage.removeItem(
                    LEGACY_ROLE_KEY
                );
            } catch (storageError) {
                console.error(
                    "Unable to clear authentication state:",
                    storageError
                );
            }
        }

        return Promise.reject(error);
    }
);

/*
 * ============================================================
 * EXPORTS
 * ============================================================
 *
 * default:
 *   authenticated Axios instance
 *
 * API_URL:
 *   backend base URL for browser resources such as:
 *   - inspection images
 *   - generated PDF reports
 *
 * The other constants are exported for future centralized
 * authentication work.
 */

export default api;

export {
    API_URL,
    DEFAULT_API_URL,
    TOKEN_KEY,
    USER_KEY,
    ROLE_KEY,
};