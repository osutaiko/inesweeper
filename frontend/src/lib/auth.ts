export const getBackendUrl = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL?.trim();

  if (backendUrl) {
    return backendUrl.replace(/\/$/, "");
  }

  if (import.meta.env.DEV) {
    return "http://localhost:3001";
  }

  throw new Error("VITE_BACKEND_URL must be set in production");
};
