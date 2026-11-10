import prisma from "../db.server";
import { normalizeLocale, type Locale } from "./locales";
import { translations } from "./translations";

// "auto" (the default) follows the merchant's own Shopify Admin language.
// Shopify appends the admin user's chosen language as a `locale` query
// parameter on embedded app page loads (this app uses offline access
// tokens, so Session.locale - only populated for online tokens - isn't
// available; the query param is Shopify's documented mechanism for this).
// Any other stored value is an explicit override chosen on the Settings page.
export async function resolveLocale(
  shop: string,
  request: Request,
): Promise<Locale> {
  const feed = await prisma.feed.findUnique({
    where: { shop },
    select: { language: true },
  });
  const override = feed?.language;
  if (override && override !== "auto") {
    return normalizeLocale(override);
  }

  const url = new URL(request.url);
  return normalizeLocale(url.searchParams.get("locale"));
}

// Returns a flat string dictionary for one namespace, English filling in any
// key missing from the target locale. Loader data must be plain serializable
// values, so this returns a plain object rather than a translate function.
export function getDictionary<T extends Record<string, string>>(
  locale: Locale,
  namespace: string,
): T {
  const en = translations.en[namespace] ?? {};
  const dict = translations[locale]?.[namespace] ?? {};
  return { ...en, ...dict } as T;
}

// Billing's plan feature lists are arrays, not flat strings - fetched
// separately from getDictionary so its generic default stays simple.
export function getPlanFeatures(locale: Locale, key: string): string[] {
  const en = (translations.en.billing?.[key] as string[]) ?? [];
  const dict = (translations[locale]?.billing?.[key] as string[]) ?? null;
  return dict ?? en;
}
