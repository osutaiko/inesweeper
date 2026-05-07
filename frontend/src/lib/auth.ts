const DEFAULT_BACKEND_URL = "http://localhost:3001";

export const getBackendUrl = () => {
  return import.meta.env.VITE_BACKEND_URL ?? DEFAULT_BACKEND_URL;
};

export const getGoogleLoginUrl = () => {
  return `${getBackendUrl()}/auth/google`;
};

export const getLogoutUrl = () => {
  return `${getBackendUrl()}/auth/logout`;
};
