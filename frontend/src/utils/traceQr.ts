const PUBLIC_ID_REGEX = /PET-[A-Z0-9]{4,}/i;

export const extractPublicId = (input: string): string | null => {
  const trimmedInput = input.trim();
  if (!trimmedInput) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedInput);
    const fromQuery = parsedUrl.searchParams.get("publicId");
    if (fromQuery && PUBLIC_ID_REGEX.test(fromQuery)) {
      return fromQuery.toUpperCase();
    }
    const fromPath = parsedUrl.pathname.match(PUBLIC_ID_REGEX)?.[0];
    if (fromPath) {
      return fromPath.toUpperCase();
    }
  } catch (_error) {
    // Bukan URL, lanjut cek regex teks biasa.
  }

  const fromPlainText = trimmedInput.match(PUBLIC_ID_REGEX)?.[0];
  return fromPlainText ? fromPlainText.toUpperCase() : null;
};

export const buildTraceUrl = (origin: string, publicId: string) =>
  `${origin}/trace?publicId=${encodeURIComponent(publicId)}`;

