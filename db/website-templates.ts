export const WEBSITE_TEMPLATES = [
  { key: "classic", name: "Classic", description: "Trusted and established", typography: "classic" },
  { key: "modern", name: "Modern", description: "Clean and energetic", typography: "modern" },
  { key: "editorial", name: "Editorial", description: "Premium and story-led", typography: "editorial" },
  { key: "skyline", name: "Skyline", description: "Sharp urban portfolio", typography: "modern" },
  { key: "boutique", name: "Boutique", description: "Warm high-touch agency", typography: "editorial" },
  { key: "estate", name: "Estate", description: "Heritage and luxury homes", typography: "classic" },
  { key: "coastal", name: "Coastal", description: "Bright lifestyle listings", typography: "modern" },
  { key: "portfolio", name: "Portfolio", description: "Gallery-first showcase", typography: "editorial" },
] as const;

export const WEBSITE_TEMPLATE_KEYS = WEBSITE_TEMPLATES.map((template) => template.key);
export const WEBSITE_TEMPLATE_KEY_SET = new Set<string>(WEBSITE_TEMPLATE_KEYS);
export const TYPOGRAPHY_KEYS = ["classic", "modern", "editorial"] as const;
export const TYPOGRAPHY_KEY_SET = new Set<string>(TYPOGRAPHY_KEYS);

export function isWebsiteTemplateKey(value: string) {
  return WEBSITE_TEMPLATE_KEY_SET.has(value);
}

export function isTypographyKey(value: string) {
  return TYPOGRAPHY_KEY_SET.has(value);
}

export function typographyForTemplate(value: string) {
  return WEBSITE_TEMPLATES.find((template) => template.key === value)?.typography || "classic";
}
