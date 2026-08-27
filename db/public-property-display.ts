import type { PublicProperty } from "./public-site";

export type PublicPropertyFact = {
  label: string;
  value: string;
};
type PublicPropertyDisplayInput = Pick<PublicProperty, "ref" | "title" | "location" | "beds" | "baths" | "parking" | "garages" | "size" | "buildingSize" | "transactionType" | "propertyType" | "features">;

const clean = (value: unknown) => String(value || "").trim();

const plural = (count: number, singular: string, pluralLabel = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralLabel}`;

export function publicPropertyFeatures(property: Pick<PublicProperty, "features">) {
  const value = property.features;
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).slice(0, 8);
  try {
    const parsed = JSON.parse(clean(value));
    return Array.isArray(parsed) ? parsed.map(clean).filter(Boolean).slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function publicPropertyKind(property: Pick<PublicProperty, "propertyType" | "title">) {
  const value = `${property.propertyType || ""} ${property.title || ""}`.toLowerCase();
  if (/\b(room|bedsitter|studio share|shared)\b/.test(value)) return "room";
  if (/\b(stand|land|plot|farm|vacant)\b/.test(value)) return "land";
  if (/\b(commercial|office|shop|retail|warehouse|industrial)\b/.test(value)) return "commercial";
  if (/\b(flat|apartment|unit|studio)\b/.test(value)) return "apartment";
  return "home";
}

export function publicPropertyFacts(property: PublicPropertyDisplayInput): PublicPropertyFact[] {
  const kind = publicPropertyKind(property);
  const facts: PublicPropertyFact[] = [];
  const add = (value: unknown, label: string) => {
    const text = clean(value);
    if (text) facts.push({ value: text, label });
  };
  const addCount = (count: number | undefined, singular: string, label: string, pluralLabel?: string) => {
    if (Number(count) > 0) facts.push({ value: plural(Number(count), singular, pluralLabel), label });
  };

  if (kind === "land") {
    add(property.size, "Land size");
    add(property.propertyType, "Property type");
    add(property.transactionType, "Listing type");
  } else if (kind === "commercial") {
    add(property.buildingSize || property.size, property.buildingSize ? "Floor area" : "Site size");
    add(property.propertyType, "Property type");
    addCount(property.parking, "parking bay", "Parking", "parking bays");
    add(property.transactionType, "Listing type");
  } else if (kind === "room") {
    add(property.propertyType || "Room", "Accommodation");
    addCount(property.beds, "room", "Rooms");
    addCount(property.baths, "bathroom", "Bathrooms");
    add(property.transactionType, "Listing type");
  } else {
    addCount(property.beds, "bedroom", "Bedrooms");
    addCount(property.baths, "bathroom", "Bathrooms");
    addCount(property.garages, "garage", "Garages");
    addCount(property.parking, "parking bay", "Parking", "parking bays");
    add(property.buildingSize, "Building size");
    add(property.size, kind === "apartment" ? "Complex/site size" : "Land size");
  }

  const unique = facts.filter((fact, index, all) => all.findIndex(item => item.label === fact.label && item.value === fact.value) === index);
  return unique.length ? unique.slice(0, 6) : [{ value: property.transactionType || "Available", label: "Listing type" }];
}

export function publicPropertySummaryItems(property: PublicPropertyDisplayInput) {
  const features = publicPropertyFeatures(property);
  const facts = publicPropertyFacts(property).map(fact => fact.value);
  return [...facts, ...features, `Reference ${property.ref}`].filter(Boolean).slice(0, 9);
}

export function publicPropertyFallbackDescription(property: PublicPropertyDisplayInput, agencyName: string) {
  const kind = publicPropertyKind(property);
  const location = property.location ? ` in ${property.location}` : "";
  const type = property.propertyType || (kind === "land" ? "land" : kind === "room" ? "room" : "property");
  return `A verified ${type.toLowerCase()}${location}, available through ${agencyName}. Contact the agency for viewing availability, current terms and the next step.`;
}
