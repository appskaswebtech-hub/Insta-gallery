export const SUPPORTED_LOCALES = ["en", "de", "es", "fr", "it"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  it: "Italiano",
};

export function isSupportedLocale(code: string): code is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(code);
}

// Shopify session locales look like "en", "de-DE", "fr-CA" etc. - only the
// language part before the dash matters for picking a supported dictionary.
export function normalizeLocale(code: string | null | undefined): Locale {
  if (!code) return "en";
  const base = code.slice(0, 2).toLowerCase();
  return isSupportedLocale(base) ? base : "en";
}
