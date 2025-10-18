export const getRedirectUrl = (): string | undefined => {
  const envRedirect = import.meta.env.VITE_REDIRECT_URL?.trim();

  if (import.meta.env.DEV && typeof window !== "undefined") {
    return `${window.location.origin}/split`;
  }

  if (envRedirect) return envRedirect;

  if (typeof window !== "undefined") {
    return `${window.location.origin}/split`;
  }

  return undefined;
};
