type AdminRequestHeaders = Partial<Record<string, string | undefined>>;

export function getAdminRequestRejection(
  headers: AdminRequestHeaders,
  requestOrigin: string,
): "content-type" | "origin" | undefined {
  const contentType = (headers["content-type"]?.split(";", 1)[0] ?? "")
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return "content-type";
  }

  const origin = headers.origin;
  if (!origin || origin === "null") {
    return "origin";
  }

  try {
    const parsedOrigin = new URL(origin);
    if (
      (parsedOrigin.protocol !== "http:" &&
        parsedOrigin.protocol !== "https:") ||
      parsedOrigin.origin !== origin ||
      parsedOrigin.origin !== requestOrigin
    ) {
      return "origin";
    }
  } catch {
    return "origin";
  }

  const fetchSite = headers["sec-fetch-site"]?.toLowerCase();
  if (fetchSite && fetchSite !== "same-origin") {
    return "origin";
  }
}

export function assertSameOriginAdminRequest(
  event: Parameters<typeof getRequestHeaders>[0],
): void {
  const rejection = getAdminRequestRejection(
    getRequestHeaders(event),
    getRequestURL(event).origin,
  );

  if (rejection === "content-type") {
    throw createError({
      statusCode: 415,
      statusMessage: "This endpoint accepts same-origin JSON requests only.",
    });
  }

  if (rejection === "origin") {
    throw createError({
      statusCode: 403,
      statusMessage: "This request origin is not allowed.",
    });
  }
}
