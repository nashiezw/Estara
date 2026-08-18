export type PlatformIdentity = {
  platformName: string;
  shortName: string;
  parentBrand: string;
  tagline: string;
  descriptor: string;
  primaryColor: string;
  defaultCountry: string;
  defaultCurrency: string;
  timezone: string;
  domain: string;
  tenantDomainSuffix: string;
  poweredByWording: string;
};

export const DEFAULT_PLATFORM_IDENTITY: PlatformIdentity = {
  platformName: "ESTARA",
  shortName: "ESTARA",
  parentBrand: "HouseLink",
  tagline: "Your Real Estate Business. Running Smarter.",
  descriptor: "The operating system for a modern real estate business.",
  primaryColor: "#153b34",
  defaultCountry: "ZW",
  defaultCurrency: "USD",
  timezone: "Africa/Harare",
  domain: "",
  tenantDomainSuffix: "",
  poweredByWording: "Powered by ESTARA",
};
