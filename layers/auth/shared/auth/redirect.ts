const localOrigin = "https://local-redirect.invalid";

export function getSafeLocalRedirect(
  candidate: unknown,
  fallback = "/app",
): string {
  if (
    typeof candidate !== "string" ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const url = new URL(candidate, localOrigin);
    const decodedPath = decodeURIComponent(url.pathname);
    if (
      url.origin !== localOrigin ||
      decodedPath.startsWith("//") ||
      decodedPath.includes("\\")
    ) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
