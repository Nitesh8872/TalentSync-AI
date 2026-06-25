import axios from "axios";

import { API_BASE_URL } from "../config/apiConfig.js";
import {
    CANDIDATE_SESSION_KEY,
    RECRUITER_SESSION_KEY,
    AUTH_EVENT,
    readSession,
} from "../utils/authSessions.js";

const axiosClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        Accept: "application/json",
    },
    timeout: 30000,
});

axiosClient.interceptors.request.use((config) => {
    const candidate = readSession(CANDIDATE_SESSION_KEY);
    const recruiter = readSession(RECRUITER_SESSION_KEY);
    const token = candidate?.access_token || recruiter?.access_token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const hadRecruiterSession = Boolean(sessionStorage.getItem(RECRUITER_SESSION_KEY));
            sessionStorage.removeItem(CANDIDATE_SESSION_KEY);
            sessionStorage.removeItem(RECRUITER_SESSION_KEY);
            window.dispatchEvent(new Event(AUTH_EVENT));
            const currentPath = window.location.pathname;
            const loginPath = hadRecruiterSession || currentPath.startsWith("/recruiter")
                ? "/recruiter/login"
                : "/candidate/login";
            const alreadyOnLogin = currentPath === "/candidate/login" || currentPath === "/recruiter/login";
            if (!alreadyOnLogin) {
                window.location.assign(loginPath);
            }
        }
        const detail = error.response?.data?.detail;
        const message =
            typeof detail === "string"
                ? detail
                : detail?.[0]?.msg || error.message || "Request failed.";
        return Promise.reject(new Error(message));
    },
);

export default axiosClient;
