"use client";

import { ChangeEvent, CSSProperties, DragEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { propertyDetails } from "../../db/marketing-creative";
import { marketingDocumentToSvg } from "../../db/marketing-document";

type Row = Record<string, any>;
type CopyState = { headline: string; listingDescription: string; socialCaption: string };
type ElementType = "text" | "image" | "logo" | "rectangle" | "circle" | "line" | "qr" | "propertyField";
type CanvasElement = { id: string; type: ElementType; name: string; role?: string; binding?: string; text?: string; src?: string; x: number; y: number; width: number; height: number; rotation: number; opacity: number; visible: boolean; locked: boolean; fill?: string; stroke?: string; radius?: number; fontSize?: number; fontFamily?: string; fontWeight?: string; fontStyle?: string; textDecoration?: string; textTransform?: "none" | "uppercase"; letterSpacing?: number; lineHeight?: number; textEffect?: string; animation?: string; align?: "left" | "center" | "right"; color?: string; z: number };
type DesignDocument = { schemaVersion: 1; editorVersion: 3; id: string; name: string; width: number; height: number; format?: string; templateId: string; propertyId: string; updatedAt: string; elements: CanvasElement[] };
type DragState = { mode: "move" | "resize" | "rotate"; id: string; handle?: string; startX: number; startY: number; base: CanvasElement };

const realPhoto = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
const designOptions = [
  { key: "signature-sale", name: "Signature Listing", category: "Image-led", palette: "dark", image: realPhoto("photo-1600585154340-be6161a56a0c") },
  { key: "editorial-split", name: "Editorial Split", category: "Magazine", palette: "light", image: realPhoto("photo-1600607687939-ce8a6c25118c") },
  { key: "prestige-cover", name: "Prestige Cover", category: "Luxury", palette: "portrait", image: realPhoto("photo-1600566753190-17f0baa2a6c3") },
  { key: "bold-panel", name: "Bold Price Panel", category: "Impact", palette: "gold", image: realPhoto("photo-1600047509807-ba8f99d2cdde") },
  { key: "open-home", name: "Open Home", category: "Invitation", palette: "dark", image: realPhoto("photo-1512917774080-9991f1c4c750") },
  { key: "rental-spotlight", name: "Rental Spotlight", category: "To rent", palette: "clean", image: realPhoto("photo-1600607687920-4e2a09cf159d") },
  { key: "sold-celebration", name: "Sold Celebration", category: "Sold", palette: "celebration", image: realPhoto("photo-1600566752355-35792bedcfea") },
  { key: "auction-countdown", name: "Auction Countdown", category: "Auction", palette: "urgent", image: realPhoto("photo-1600585154526-990dced4db0d") },
  { key: "commercial-lease", name: "Commercial Lease", category: "Commercial", palette: "corporate", image: realPhoto("photo-1497366754035-f200968a6e72") },
  { key: "land-opportunity", name: "Land Opportunity", category: "Land", palette: "earth", image: realPhoto("photo-1500382017468-9049fed747ef") },
  { key: "development-launch", name: "Development Launch", category: "New build", palette: "launch", image: realPhoto("photo-1600607688969-a5bfcd646154") },
  { key: "agent-feature", name: "Agent Feature", category: "Agent", palette: "personal", image: realPhoto("photo-1560518883-ce09059eeffa") },
  { key: "valuation-offer", name: "Valuation Offer", category: "Lead gen", palette: "service", image: realPhoto("photo-1560518883-89d2645de960") },
  { key: "price-improvement", name: "Price Improvement", category: "Price drop", palette: "offer", image: realPhoto("photo-1600573472592-401b489a3cdc") },
];
const rail = [
  { name: "Templates", icon: "▯" },
  { name: "Elements", icon: "⌘" },
  { name: "Text", icon: "T" },
  { name: "Brand", icon: "♕" },
  { name: "Uploads", icon: "☁" },
  { name: "Tools", icon: "✎" },
  { name: "Projects", icon: "□" },
  { name: "Apps", icon: "⌘" },
  { name: "Magic Media", icon: "◩" },
  { name: "Layers", icon: "▤" },
];
const elementCategories = [
  { key: "shapes", name: "Shapes", icon: "△", tone: "cyan" },
  { key: "graphics", name: "Graphics", icon: "✹", tone: "orange" },
  { key: "lines", name: "Lines", icon: "↓", tone: "ink" },
  { key: "qr", name: "QR Code", icon: "▦", tone: "violet" },
  { key: "frames", name: "Frames", icon: "▣", tone: "green" },
  { key: "badges", name: "Badges", icon: "★", tone: "pink" },
];
const elementLibraries: Row = {
  shapes: [
    { title: "Lines", items: [{ label: "Solid", type: "line", icon: "━", patch: { width: 180, height: 4 } }, { label: "Dash", type: "line", icon: "┄", patch: { width: 180, height: 4, opacity: .65 } }, { label: "Arrow", type: "text", icon: "→", patch: { text: "→", fontSize: 68, color: "#111827", width: 150, height: 82 } }] },
    { title: "Basic shapes", items: [{ label: "Square", type: "rectangle", icon: "■", patch: { width: 150, height: 150, radius: 0 } }, { label: "Rounded", type: "rectangle", icon: "▣", patch: { width: 170, height: 120, radius: 24 } }, { label: "Circle", type: "circle", icon: "●", patch: { width: 150, height: 150 } }, { label: "Triangle", type: "text", icon: "▲", patch: { text: "▲", fontSize: 92, color: "#111827", width: 140, height: 120 } }] },
    { title: "Polygons", items: [{ label: "Pentagon", type: "text", icon: "⬟", patch: { text: "⬟", fontSize: 92, color: "#111827", width: 130, height: 120 } }, { label: "Hexagon", type: "text", icon: "⬢", patch: { text: "⬢", fontSize: 92, color: "#111827", width: 130, height: 120 } }, { label: "Diamond", type: "text", icon: "◆", patch: { text: "◆", fontSize: 88, color: "#111827", width: 120, height: 120 } }] },
    { title: "Stars", items: [{ label: "Spark", type: "text", icon: "✦", patch: { text: "✦", fontSize: 86, color: "#111827", width: 120, height: 120 } }, { label: "Star", type: "text", icon: "★", patch: { text: "★", fontSize: 86, color: "#111827", width: 120, height: 120 } }, { label: "Burst", type: "text", icon: "✸", patch: { text: "✸", fontSize: 86, color: "#111827", width: 120, height: 120 } }] },
    { title: "Arrows", items: ["➡", "⬅", "⬆", "⬇"].map((icon) => ({ label: "Arrow", type: "text", icon, patch: { text: icon, fontSize: 72, color: "#111827", width: 130, height: 110 } })) },
  ],
  graphics: [
    { title: "Property graphics", items: [{ label: "Home", type: "text", icon: "⌂", patch: { text: "⌂", fontSize: 86, color: "#111827", width: 120, height: 120 } }, { label: "Key", type: "text", icon: "⚿", patch: { text: "⚿", fontSize: 86, color: "#111827", width: 120, height: 120 } }, { label: "Pin", type: "text", icon: "●", patch: { text: "●", fontSize: 70, color: "#111827", width: 100, height: 100 } }] },
    { title: "Highlights", items: [{ label: "Gold dot", type: "circle", icon: "●", patch: { fill: "#e6bd5f", width: 90, height: 90 } }, { label: "Brand block", type: "rectangle", icon: "■", patch: { fill: "#153b34", width: 180, height: 90, radius: 18 } }, { label: "Price pill", type: "rectangle", icon: "▰", patch: { fill: "#e6bd5f", width: 220, height: 72, radius: 999 } }] },
  ],
  lines: [
    { title: "Line styles", items: [{ label: "Thin", type: "line", icon: "━", patch: { width: 220, height: 3 } }, { label: "Bold", type: "line", icon: "━", patch: { width: 220, height: 10 } }, { label: "Accent", type: "line", icon: "━", patch: { width: 160, height: 8, fill: "#e6bd5f" } }, { label: "Vertical", type: "line", icon: "┃", patch: { width: 8, height: 180 } }] },
  ],
  qr: [{ title: "QR code", items: [{ label: "Property QR", type: "qr", icon: "▦", patch: { width: 140, height: 140 } }, { label: "QR badge", type: "rectangle", icon: "▣", patch: { fill: "#ffffff", width: 180, height: 180, radius: 18 } }] }],
  frames: [{ title: "Frames", items: [{ label: "Photo frame", type: "rectangle", icon: "▣", patch: { fill: "#ffffff", stroke: "#153b34", width: 320, height: 220, radius: 18, opacity: .92 } }, { label: "Story frame", type: "rectangle", icon: "▯", patch: { fill: "#ffffff", stroke: "#e6bd5f", width: 220, height: 360, radius: 26, opacity: .92 } }] }],
  badges: [{ title: "Badges", items: [{ label: "Just listed", type: "text", icon: "JUST", patch: { text: "JUST LISTED", fontSize: 24, fontFamily: "Arial", fontWeight: "900", color: "#153b34", width: 210, height: 48 } }, { label: "Sold", type: "text", icon: "SOLD", patch: { text: "SOLD", fontSize: 42, fontFamily: "Arial", fontWeight: "900", color: "#a33b2f", width: 150, height: 60 } }, { label: "New", type: "circle", icon: "NEW", patch: { fill: "#e6bd5f", width: 110, height: 110 } }] }],
};
const textCombinations = [
  { name: "Just Listed", style: "just-listed", font: "Arial", weight: "900", text: "JUST\nLISTED", color: "#153b34", size: 34, lineHeight: .9, letterSpacing: 1.2 },
  { name: "Luxury Listing", style: "luxury", font: "Georgia", weight: "900", text: "LUXURY\nLISTING", color: "#153b34", size: 31, lineHeight: .94, letterSpacing: 1.4 },
  { name: "Price Drop", style: "price-drop", font: "Arial", weight: "900", text: "PRICE\nDROP", color: "#ffffff", size: 35, lineHeight: .9 },
  { name: "For Rent", style: "rent", font: "Arial", weight: "900", text: "FOR\nRENT", color: "#12352e", size: 36, lineHeight: .88 },
  { name: "Sold", style: "sold", font: "Georgia", weight: "900", text: "SOLD", color: "#ffffff", size: 46, lineHeight: 1, letterSpacing: 2 },
  { name: "Open Viewing", style: "open", font: "Arial", weight: "900", text: "OPEN\nVIEWING", color: "#ffffff", size: 31, lineHeight: .88 },
  { name: "Exclusive", style: "exclusive", font: "Georgia", weight: "900", text: "EXCLUSIVE\nMANDATE", color: "#193d35", size: 25, lineHeight: .95, letterSpacing: 1 },
  { name: "Address", style: "address", font: "Georgia", weight: "700", text: "Borrowdale\nHarare", color: "#45685d", size: 30, lineHeight: .95, fontStyle: "italic" },
  { name: "Agent Callout", style: "agent", font: "Arial", weight: "900", text: "CALL\nTHE AGENT", color: "#153b34", size: 26, lineHeight: .95 },
  { name: "Development", style: "development", font: "Arial", weight: "900", text: "NEW\nDEVELOPMENT", color: "#111827", size: 26, lineHeight: .95 },
  { name: "Golden Hour", style: "golden", font: "Georgia", weight: "900", text: "GOLDEN\nHOUR", color: "#c69b34", size: 32, lineHeight: .92 },
  { name: "Signature", style: "signature", font: "Georgia", weight: "700", text: "Signature", color: "#e7b951", size: 31, lineHeight: 1, fontStyle: "italic", effect: "glow" },
];
const textEffects = [
  { name: "Drop", value: "drop" }, { name: "Glow", value: "glow" }, { name: "Echo", value: "echo" },
  { name: "Outline", value: "outline" }, { name: "Background", value: "background" }, { name: "Splice", value: "splice" },
  { name: "Hollow", value: "hollow" }, { name: "Neon", value: "neon" }, { name: "Glitch", value: "glitch" },
];
const advancedTextEffects = [
  { name: "Neon Lights", value: "neon-lights" }, { name: "TV Static", value: "static" }, { name: "70s", value: "retro" },
];
const textAnimations = ["Typewriter", "Ascend", "Shift", "Merge", "Block", "Burst", "Bounce", "Roll", "Skate", "Spread", "Clarify"];
const presetSizes = [
  { key: "whatsapp_card", name: "WhatsApp card", width: 1200, height: 628 },
  { key: "instagram_post", name: "Instagram post", width: 1080, height: 1080 },
  { key: "instagram_story", name: "Instagram story", width: 1080, height: 1920 },
  { key: "whatsapp_status", name: "WhatsApp status", width: 1080, height: 1920 },
  { key: "facebook_square", name: "Facebook 1:1", width: 1080, height: 1080 },
  { key: "facebook_portrait", name: "Facebook 4:5", width: 1080, height: 1350 },
  { key: "flyer", name: "Property flyer", width: 595, height: 842 },
];
const defaultCopy: CopyState = { headline: "", listingDescription: "", socialCaption: "" };
const uid = () => Math.random().toString(36).slice(2, 10);
const money = (p?: Row) => p?.price || `${p?.currency || "USD"} ${Math.round(Number(p?.priceMinor || 0) / 100).toLocaleString("en-US")}`;
const samplePhoto = (index = 0) => designOptions[index % designOptions.length].image;
const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = reject; reader.readAsDataURL(file); });

function createDoc(property: Row | undefined, agency: Row | undefined, templateId = "signature-sale", width = 1200, height = 628): DesignDocument {
  const template = designOptions.find((item) => item.key === templateId) || designOptions[0];
  const primary = agency?.primaryColor || "#113d35", accent = agency?.accentColor || "#e8c45f", photo = property?.photoUrl || property?.media?.[0]?.url || template.image;
  const p = property || {}, title = p.title || "Borrowdale Residence";
  const details = propertyDetails(p), price = money(p), brand = agency?.name?.toUpperCase() || "ESTARA";
  const layer = (patch: Partial<CanvasElement>) => ({ id: "", type: "rectangle", name: "Layer", x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1, visible: true, locked: false, z: 0, ...patch }) as CanvasElement;
  const signature = [
    layer({ id: "bg", name: "Background", fill: primary, width, height }),
    layer({ id: "photo", type: "image", name: "Property Image", role: "HERO_IMAGE", binding: "{{property.image}}", src: photo, x: width * .46, width: width * .54, height, opacity: .9, z: 1 }),
    layer({ id: "wash", name: "Image Overlay", fill: primary, width, height, opacity: .58, z: 2 }),
    layer({ id: "brand", type: "text", name: "Agency Name", role: "LOGO", binding: "{{agency.name}}", text: brand, x: width * .07, y: height * .12, width: width * .44, height: 34, fontSize: 18, fontFamily: "Arial", fontWeight: "900", color: accent, z: 3 }),
    layer({ id: "badge", type: "text", name: "Badge", role: "BADGE", text: "JUST LISTED", x: width * .07, y: height * .25, width: 165, height: 35, fontSize: 15, fontFamily: "Arial", fontWeight: "900", color: accent, z: 4 }),
    layer({ id: "title", type: "text", name: "Property Title", role: "TITLE", binding: "{{property.title}}", text: title, x: width * .07, y: height * .38, width: width * .52, height: 120, fontSize: 56, fontFamily: "Georgia", fontWeight: "900", color: "#ffffff", z: 5 }),
    layer({ id: "details", type: "text", name: "Property Details", role: "BEDROOMS", binding: "{{property.details}}", text: details, x: width * .07, y: height * .66, width: width * .56, height: 32, fontSize: 18, fontFamily: "Arial", fontWeight: "700", color: "#dce8e3", z: 6 }),
    layer({ id: "price", type: "text", name: "Price", role: "PRICE", binding: "{{property.price}}", text: price, x: width * .07, y: height * .75, width: width * .38, height: 48, fontSize: 36, fontFamily: "Georgia", fontWeight: "900", color: "#ffffff", z: 7 }),
    layer({ id: "cta", type: "text", name: "CTA", role: "CTA", text: "Book a viewing", x: width * .07, y: height * .88, width: 240, height: 30, fontSize: 17, fontFamily: "Arial", fontWeight: "900", color: accent, z: 8 }),
  ];
  const layouts: Row = {
    "editorial-split": [
      layer({ id: "bg", name: "Warm Editorial Background", fill: "#f7f2e8", width, height }),
      layer({ id: "photo", type: "image", name: "Property Image", role: "HERO_IMAGE", binding: "{{property.image}}", src: photo, x: width * .06, y: height * .1, width: width * .48, height: height * .78, radius: 22, z: 1 }),
      layer({ id: "brand", type: "text", name: "Agency Name", role: "LOGO", binding: "{{agency.name}}", text: brand, x: width * .6, y: height * .12, width: width * .32, height: 28, fontSize: 15, fontFamily: "Arial", fontWeight: "900", color: primary, z: 2 }),
      layer({ id: "title", type: "text", name: "Property Title", role: "TITLE", binding: "{{property.title}}", text: title, x: width * .6, y: height * .25, width: width * .34, height: 130, fontSize: 52, fontFamily: "Georgia", fontWeight: "900", color: primary, z: 3 }),
      layer({ id: "details", type: "text", name: "Property Details", role: "BEDROOMS", binding: "{{property.details}}", text: details, x: width * .6, y: height * .55, width: width * .32, height: 42, fontSize: 17, fontFamily: "Arial", fontWeight: "700", color: "#52655f", z: 4 }),
      layer({ id: "price", type: "text", name: "Price", role: "PRICE", binding: "{{property.price}}", text: price, x: width * .6, y: height * .7, width: width * .28, height: 46, fontSize: 34, fontFamily: "Georgia", fontWeight: "900", color: primary, z: 5 }),
      layer({ id: "accent", name: "Accent Rule", fill: accent, x: width * .6, y: height * .83, width: width * .22, height: 8, radius: 999, z: 6 }),
    ],
    "prestige-cover": [
      layer({ id: "photo", type: "image", name: "Property Image", role: "HERO_IMAGE", binding: "{{property.image}}", src: photo, width, height, z: 0 }),
      layer({ id: "wash", name: "Cinematic Overlay", fill: "#061f1b", width, height, opacity: .52, z: 1 }),
      layer({ id: "brand", type: "text", name: "Agency Name", role: "LOGO", binding: "{{agency.name}}", text: brand, x: width * .08, y: height * .1, width: width * .36, height: 28, fontSize: 16, fontFamily: "Arial", fontWeight: "900", color: accent, z: 2 }),
      layer({ id: "title", type: "text", name: "Property Title", role: "TITLE", binding: "{{property.title}}", text: title, x: width * .12, y: height * .34, width: width * .76, height: 140, fontSize: 70, fontFamily: "Georgia", fontWeight: "900", align: "center", color: "#ffffff", z: 3 }),
      layer({ id: "details", type: "text", name: "Property Details", role: "BEDROOMS", binding: "{{property.details}}", text: details, x: width * .2, y: height * .62, width: width * .6, height: 34, fontSize: 18, fontFamily: "Arial", fontWeight: "700", align: "center", color: "#eaf0ec", z: 4 }),
      layer({ id: "pricePanel", name: "Price Panel", fill: accent, x: width * .36, y: height * .76, width: width * .28, height: 64, radius: 999, z: 5 }),
      layer({ id: "price", type: "text", name: "Price", role: "PRICE", binding: "{{property.price}}", text: price, x: width * .38, y: height * .79, width: width * .24, height: 34, fontSize: 26, fontFamily: "Arial", fontWeight: "900", align: "center", color: primary, z: 6 }),
    ],
    "bold-panel": [
      layer({ id: "photo", type: "image", name: "Property Image", role: "HERO_IMAGE", binding: "{{property.image}}", src: photo, width: width * .62, height, z: 0 }),
      layer({ id: "panel", name: "Price Panel", fill: accent, x: width * .62, width: width * .38, height, z: 1 }),
      layer({ id: "brand", type: "text", name: "Agency Name", role: "LOGO", binding: "{{agency.name}}", text: brand, x: width * .68, y: height * .12, width: width * .24, height: 28, fontSize: 16, fontFamily: "Arial", fontWeight: "900", color: primary, z: 2 }),
      layer({ id: "title", type: "text", name: "Property Title", role: "TITLE", binding: "{{property.title}}", text: title, x: width * .68, y: height * .28, width: width * .25, height: 140, fontSize: 48, fontFamily: "Georgia", fontWeight: "900", color: primary, z: 3 }),
      layer({ id: "price", type: "text", name: "Price", role: "PRICE", binding: "{{property.price}}", text: price, x: width * .68, y: height * .62, width: width * .24, height: 52, fontSize: 36, fontFamily: "Arial", fontWeight: "900", color: primary, z: 4 }),
      layer({ id: "details", type: "text", name: "Property Details", role: "BEDROOMS", binding: "{{property.details}}", text: details, x: width * .68, y: height * .75, width: width * .24, height: 54, fontSize: 15, fontFamily: "Arial", fontWeight: "800", color: "#33423d", z: 5 }),
    ],
    "open-home": [
      layer({ id: "bg", name: "Background", fill: "#ffffff", width, height }),
      layer({ id: "photo", type: "image", name: "Property Image", role: "HERO_IMAGE", binding: "{{property.image}}", src: photo, x: width * .08, y: height * .15, width: width * .84, height: height * .5, radius: 18, z: 1 }),
      layer({ id: "badgeShape", name: "Open Home Badge", fill: accent, x: width * .08, y: height * .08, width: 150, height: 42, radius: 999, z: 2 }),
      layer({ id: "badge", type: "text", name: "Badge", role: "BADGE", text: "OPEN HOME", x: width * .105, y: height * .103, width: 110, height: 20, fontSize: 14, fontFamily: "Arial", fontWeight: "900", color: primary, z: 3 }),
      layer({ id: "title", type: "text", name: "Property Title", role: "TITLE", binding: "{{property.title}}", text: title, x: width * .08, y: height * .7, width: width * .5, height: 80, fontSize: 44, fontFamily: "Georgia", fontWeight: "900", color: primary, z: 4 }),
      layer({ id: "details", type: "text", name: "Property Details", role: "BEDROOMS", binding: "{{property.details}}", text: details, x: width * .08, y: height * .86, width: width * .44, height: 30, fontSize: 16, fontFamily: "Arial", fontWeight: "700", color: "#52655f", z: 5 }),
      layer({ id: "price", type: "text", name: "Price", role: "PRICE", binding: "{{property.price}}", text: price, x: width * .66, y: height * .75, width: width * .25, height: 44, fontSize: 30, fontFamily: "Arial", fontWeight: "900", align: "right", color: primary, z: 6 }),
    ],
  };
  const fromSignature = (changes: Row) => signature.map((item) => ({ ...item, ...(changes[item.id] || {}) }));
  const variantLayouts: Row = {
    "rental-spotlight": fromSignature({ bg: { fill: "#f7f4ea" }, wash: { opacity: .12 }, photo: { x: width * .08, y: height * .13, width: width * .46, height: height * .72, radius: 22, opacity: 1 }, brand: { x: width * .6, y: height * .14, color: primary }, badge: { text: "TO RENT", x: width * .6, y: height * .25, color: accent }, title: { x: width * .6, y: height * .36, width: width * .32, color: primary, fontSize: 48 }, details: { x: width * .6, y: height * .62, width: width * .32, color: "#596a64" }, price: { x: width * .6, y: height * .73, color: primary }, cta: { text: "Schedule a viewing", x: width * .6, y: height * .86, color: primary } }),
    "sold-celebration": fromSignature({ wash: { fill: "#121212", opacity: .42 }, badge: { text: "SOLD", fontSize: 32, color: accent }, title: { y: height * .42, align: "center", x: width * .16, width: width * .68, fontSize: 64 }, details: { text: "Another successful sale", binding: undefined, x: width * .28, y: height * .68, width: width * .44, align: "center" }, price: { text: "Let us sell yours", binding: undefined, x: width * .31, y: height * .77, width: width * .38, align: "center", color: accent }, cta: { text: "Request a valuation", x: width * .38, y: height * .89 } }),
    "auction-countdown": fromSignature({ bg: { fill: "#111827" }, photo: { x: width * .5, width: width * .5, opacity: .78 }, wash: { opacity: .25 }, badge: { text: "AUCTION", color: "#ffffff", fontSize: 22 }, title: { y: height * .32, width: width * .42, fontSize: 54 }, details: { text: "Register before viewing day", binding: undefined, y: height * .6 }, price: { text: "Reserve now open", binding: undefined, color: accent, y: height * .72 }, cta: { text: "Bid pack available" } }),
    "commercial-lease": fromSignature({ bg: { fill: "#f5f7f8" }, photo: { x: width * .04, y: height * .08, width: width * .54, height: height * .84, radius: 6, opacity: 1 }, wash: { opacity: 0 }, brand: { x: width * .64, y: height * .12, color: "#334155" }, badge: { text: "COMMERCIAL", x: width * .64, y: height * .24, color: accent }, title: { x: width * .64, y: height * .34, width: width * .28, color: "#0f172a", fontFamily: "Arial", fontSize: 46 }, details: { x: width * .64, y: height * .62, width: width * .3, color: "#64748b" }, price: { x: width * .64, y: height * .74, color: "#0f172a", fontFamily: "Arial" }, cta: { text: "Book inspection", x: width * .64, y: height * .88, color: accent } }),
    "land-opportunity": fromSignature({ bg: { fill: "#f3ead7" }, photo: { x: 0, y: 0, width, height: height * .58, opacity: .95 }, wash: { y: height * .58, height: height * .42, opacity: 0, fill: "#f3ead7" }, brand: { y: height * .64, color: primary }, badge: { text: "LAND FOR SALE", y: height * .71, color: "#876b2b" }, title: { y: height * .78, width: width * .45, height: 74, fontSize: 42, color: primary }, details: { x: width * .56, y: height * .69, width: width * .34, color: "#5f6d48" }, price: { x: width * .56, y: height * .79, color: primary }, cta: { x: width * .56, y: height * .9, color: "#876b2b" } }),
    "development-launch": fromSignature({ bg: { fill: primary }, photo: { x: width * .36, y: height * .08, width: width * .58, height: height * .84, radius: 24, opacity: 1 }, wash: { opacity: .18 }, badge: { text: "NEW DEVELOPMENT" }, title: { y: height * .34, width: width * .34, fontSize: 48 }, details: { text: "Modern homes launching now", binding: undefined, y: height * .62 }, price: { text: "Register interest", binding: undefined, color: accent }, cta: { text: "Download brochure" } }),
    "agent-feature": fromSignature({ bg: { fill: "#ffffff" }, photo: { x: width * .58, y: height * .1, width: width * .32, height: height * .78, radius: 999, opacity: 1 }, wash: { opacity: 0 }, brand: { color: primary }, badge: { text: "MEET YOUR AGENT", color: accent }, title: { text: dataTitleCase(agency?.name || "Local Property Expert"), binding: undefined, color: primary, fontSize: 46, y: height * .34 }, details: { text: [agency?.phone, agency?.email].filter(Boolean).join(" · ") || "Trusted local real estate advice", binding: undefined, color: "#52655f" }, price: { text: "Free market appraisal", binding: undefined, color: primary }, cta: { text: "Start the conversation", color: accent } }),
    "valuation-offer": fromSignature({ bg: { fill: "#eef4f0" }, photo: { x: width * .62, width: width * .38, opacity: .72 }, wash: { opacity: 0 }, badge: { text: "FREE VALUATION", color: accent }, title: { text: "What is your property worth?", binding: undefined, color: primary, fontSize: 52, width: width * .46 }, details: { text: "Accurate pricing guidance from local market data", binding: undefined, color: "#52655f" }, price: { text: "Book your appraisal", binding: undefined, color: primary }, cta: { text: "No obligation", color: accent } }),
    "price-improvement": fromSignature({ bg: { fill: "#fff7ed" }, wash: { fill: "#7c2d12", opacity: .28 }, badge: { text: "PRICE IMPROVED", color: accent }, title: { fontSize: 58 }, details: { text: "Motivated seller · viewing slots available", binding: undefined }, price: { color: accent, fontSize: 42 }, cta: { text: "Make an offer" } }),
  };
  const resolvedElements = layouts[templateId] || variantLayouts[templateId] || signature;
  return {
    schemaVersion: 1, editorVersion: 3, id: `design-${uid()}`, name: `${title} - ${presetSizes.find((x) => x.width === width && x.height === height)?.name || "Marketing Design"}`, format: presetSizes.find((x) => x.width === width && x.height === height)?.key || "whatsapp_card",
    width, height, templateId, propertyId: p.id || "", updatedAt: new Date().toISOString(),
    elements: resolvedElements,
  };
}

function dataTitleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function bindValue(binding: string | undefined, property: Row | undefined, agency: Row | undefined) {
  const p = property || {}, a = agency || {};
  const map: Row = { "{{property.price}}": money(p), "{{property.title}}": p.title, "{{property.suburb}}": p.suburb, "{{property.bedrooms}}": p.bedrooms, "{{property.bathrooms}}": p.bathrooms, "{{property.details}}": propertyDetails(p), "{{agency.name}}": a.name, "{{agent.phone}}": a.phone, "{{agent.email}}": a.email };
  return String(map[binding || ""] ?? "");
}

type StudioThemeVars = CSSProperties & { "--studio-brand": string; "--studio-accent": string };

export default function MarketingStudioClient({ platform }: { platform: { shortName: string; primaryColor: string; accentColor: string } }) {
  const [data, setData] = useState<Row | null>(null), [propertyId, setPropertyId] = useState("");
  const [copy, setCopy] = useState<CopyState>(defaultCopy), [message, setMessage] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [tool, setTool] = useState("Templates"), [search, setSearch] = useState(""), [doc, setDoc] = useState<DesignDocument | null>(null), [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [history, setHistory] = useState<DesignDocument[]>([]), [future, setFuture] = useState<DesignDocument[]>([]), [zoom, setZoom] = useState(.52), [saveState, setSaveState] = useState<"Saved" | "Saving..." | "Unsaved changes" | "Save failed">("Saved");
  const [clipboard, setClipboard] = useState<CanvasElement | null>(null);
  const [styleClipboard, setStyleClipboard] = useState<Partial<CanvasElement> | null>(null);
  const [studioUploads, setStudioUploads] = useState<Row[]>([]), [renderFormat, setRenderFormat] = useState("whatsapp_card"), [elementCategory, setElementCategory] = useState("");
  const [exportKind, setExportKind] = useState<"png" | "jpg" | "svg">("png"), [editingText, setEditingText] = useState(""), [mobileToolsOpen, setMobileToolsOpen] = useState(false), [mobileFitZoom, setMobileFitZoom] = useState(.52), drag = useRef<DragState | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null), canvasRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      const response = await fetch("/api/marketing", { cache: "no-store" }), body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Marketing Studio could not be loaded.");
      setData({ ...body, properties: body.properties || [], copies: body.copies || [], jobs: body.jobs || [], templates: body.templates || [] });
      setPropertyId((current) => current || body.properties?.[0]?.id || "");
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Marketing Studio could not be loaded."); }
  };
  useEffect(() => { void load(); }, []);

  const property = useMemo(() => data?.properties.find((item: Row) => item.id === propertyId), [data, propertyId]);
  const copies = useMemo(() => data?.copies.filter((item: Row) => item.propertyId === propertyId) || [], [data, propertyId]);
  const jobs = useMemo(() => data?.jobs.filter((item: Row) => item.propertyId === propertyId) || [], [data, propertyId]);
  const activeCopy = copies.find((item: Row) => item.status === "draft") || copies.find((item: Row) => item.status === "approved");
  const selected = doc?.elements.find((item) => item.id === selectedIds[0]);
  const effectiveZoom = typeof window !== "undefined" && window.matchMedia("(max-width: 820px)").matches ? Math.min(zoom, mobileFitZoom) : zoom;
  const selectedIsText = selected?.type === "text" || selected?.type === "propertyField";
  const selectedIsImage = selected?.type === "image" || selected?.type === "logo";
  const selectedLayerIndex = selected && doc ? [...doc.elements].sort((a, b) => b.z - a.z).findIndex((item) => item.id === selected.id) + 1 : 0;
  const templates = designOptions.filter((item) => `${item.name} ${item.category} ${item.palette}`.toLowerCase().includes(search.toLowerCase()));
  const propertyPhotos = property?.media?.length ? property.media : property?.photoUrl ? [{ id: "hero", url: property.photoUrl, label: "Property hero" }] : [];
  const samplePhotos = propertyPhotos.length || studioUploads.length ? [] : [0, 1, 2, 3, 4, 5].map((index) => ({ id: `sample-${index}`, url: samplePhoto(index), label: "Sample property image" }));
  const galleryPhotos = [...propertyPhotos, ...studioUploads, ...samplePhotos];
  const uploadKey = `estara-marketing-uploads:${data?.agency?.id || "local"}`;

  useEffect(() => {
    if (!doc) return;
    const fit = () => {
      const mobile = window.matchMedia("(max-width: 820px)").matches;
      if (!mobile) return;
      const viewport = window.visualViewport;
      const width = Math.max(1, (viewport?.width || window.innerWidth) - 20), height = Math.max(1, (viewport?.height || window.innerHeight) - 222);
      const next = Math.max(.18, Math.min(width / doc.width, height / doc.height, .85));
      setMobileFitZoom(Number(next.toFixed(3)));
    };
    fit();
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => { window.removeEventListener("resize", fit); window.visualViewport?.removeEventListener("resize", fit); };
  }, [doc?.width, doc?.height]);

  useEffect(() => {
    if (!data) return;
    try {
      const storageKey = propertyId || "__no-property__";
      const saved = localStorage.getItem(`estara-marketing-document:${storageKey}`);
      const parsed = saved ? JSON.parse(saved) : null;
      const nextDoc = parsed?.editorVersion === 3 && parsed.propertyId === storageKey ? parsed : createDoc(property, data.agency);
      const image = property?.photoUrl || property?.media?.[0]?.url || "";
      setRenderFormat(nextDoc.format || presetSizes.find((item) => item.width === nextDoc.width && item.height === nextDoc.height)?.key || "whatsapp_card");
      setDoc({ ...nextDoc, propertyId: storageKey, elements: nextDoc.elements.map((item) => item.binding === "{{property.image}}" && image ? { ...item, src: image } : item.binding ? { ...item, text: bindValue(item.binding, property, data.agency) } : item) });
    } catch {
      const nextDoc = createDoc(property, data.agency);
      setRenderFormat(nextDoc.format || "whatsapp_card"); setDoc({ ...nextDoc, propertyId: propertyId || "__no-property__" });
    }
  }, [data?.agency?.id, propertyId, property?.photoUrl]);
  useEffect(() => {
    if (!data?.agency?.id) return;
    try {
      const saved = JSON.parse(localStorage.getItem(uploadKey) || "[]");
      setStudioUploads(Array.isArray(saved) ? saved.filter((item) => item?.url).slice(0, 36) : []);
    } catch { setStudioUploads([]); }
  }, [data?.agency?.id]);

  useEffect(() => { setCopy(activeCopy ? { headline: activeCopy.headline || "", listingDescription: activeCopy.listingDescription || "", socialCaption: activeCopy.socialCaption || "" } : defaultCopy); }, [activeCopy?.id, activeCopy?.headline, activeCopy?.listingDescription, activeCopy?.socialCaption]);
  useEffect(() => {
    if (!doc) return;
    setSaveState("Saving...");
    const storageKey = propertyId || "__no-property__";
    const timer = window.setTimeout(() => { try { localStorage.setItem(`estara-marketing-document:${storageKey}`, JSON.stringify({ ...doc, propertyId: storageKey, updatedAt: new Date().toISOString() })); setSaveState("Saved"); } catch { setSaveState("Save failed"); } }, 600);
    return () => window.clearTimeout(timer);
  }, [doc, propertyId]);

  const commit = (next: DesignDocument, keepSelection = true) => {
    if (!doc) return;
    setHistory((items) => [...items.slice(-39), doc]); setFuture([]); setDoc({ ...next, updatedAt: new Date().toISOString() }); setSaveState("Unsaved changes");
    if (!keepSelection) setSelectedIds([]);
  };
  const patchElement = (id: string, patch: Partial<CanvasElement>, remember = true) => {
    if (!doc) return;
    if (remember) return commit({ ...doc, elements: doc.elements.map((item) => item.id === id ? { ...item, ...patch } : item) });
    setDoc((current) => current ? { ...current, updatedAt: new Date().toISOString(), elements: current.elements.map((item) => item.id === id ? { ...item, ...patch } : item) } : current);
    setSaveState("Unsaved changes");
  };
  const addElement = (type: ElementType, patch: Partial<CanvasElement> = {}) => {
    if (!doc) return;
    const id = `${type}-${uid()}`, base: CanvasElement = { id, type, name: type === "text" ? "New Text" : type === "propertyField" ? "Property Field" : type === "qr" ? "QR Code" : "Shape", text: type === "text" ? "Add your text" : type === "qr" ? "Scan for property" : "", x: doc.width * .36, y: doc.height * .36, width: type === "line" ? 220 : 230, height: type === "line" ? 6 : type === "circle" ? 170 : 80, rotation: 0, opacity: 1, visible: true, locked: false, fill: type === "text" || type === "propertyField" ? undefined : data?.agency?.accentColor || "#e8c45f", stroke: "#ffffff", radius: type === "rectangle" ? 10 : 999, fontSize: 32, fontFamily: "Arial", fontWeight: "800", color: "#ffffff", z: Math.max(...doc.elements.map((x) => x.z), 0) + 1, ...patch };
    commit({ ...doc, elements: [...doc.elements, base] }); setSelectedIds([id]);
  };
  const addLibraryElement = (item: Row, at?: { x: number; y: number }) => {
    const patch = { ...(item.patch || {}) };
    const primary = data?.agency?.primaryColor || platform.primaryColor || "#153b34", accent = data?.agency?.accentColor || platform.accentColor || "#e6bd5f";
    if (item.type === "text" && (!patch.color || patch.color === "#111827")) patch.color = item.tone === "accent" ? accent : primary;
    if ((item.type === "rectangle" || item.type === "circle" || item.type === "line") && (!patch.fill || patch.fill === "#153b34" || patch.fill === "#111827")) patch.fill = item.tone === "accent" ? accent : primary;
    addElement(item.type as ElementType, { name: item.label, ...patch, ...(at || {}) });
  };
  const canvasPoint = (event: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect ? { x: (event.clientX - rect.left) / effectiveZoom, y: (event.clientY - rect.top) / effectiveZoom } : { x: (doc?.width || 1200) * .36, y: (doc?.height || 628) * .36 };
  };
  const placeOrReplaceImage = (src: string, at?: { x: number; y: number }) => {
    if (selectedIsImage && selected) patchElement(selected.id, { src, binding: undefined });
    else addElement("image", { name: "Uploaded Image", src, x: at?.x ?? (doc?.width || 1200) * .32, y: at?.y ?? (doc?.height || 628) * .28, width: Math.min(420, (doc?.width || 1200) * .36), height: Math.min(300, (doc?.height || 628) * .42) });
  };
  const rememberUpload = (src: string, name = "Uploaded image") => {
    const upload = { id: `upload-${uid()}`, url: src, label: name, source: "studio-upload" };
    setStudioUploads((items) => {
      const next = [upload, ...items.filter((item) => item.url !== src)].slice(0, 36);
      try { localStorage.setItem(uploadKey, JSON.stringify(next)); } catch { setError("Image was placed, but the browser upload library is full."); }
      return next;
    });
    return upload;
  };
  const useFileImage = async (file: File, at?: { x: number; y: number }) => {
    const upload = rememberUpload(await fileToDataUrl(file), file.name || "Uploaded image");
    placeOrReplaceImage(upload.url, at);
    setTool("Uploads");
  };
  const changeImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file?.type.startsWith("image/")) await useFileImage(file);
    event.target.value = "";
  };
  const dragStudioItem = (event: DragEvent, payload: Row) => { event.dataTransfer.setData("text/estara", JSON.stringify(payload)); event.dataTransfer.effectAllowed = "copy"; };
  const dropOnCanvas = async (event: DragEvent) => {
    event.preventDefault();
    const at = canvasPoint(event), file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith("image/"));
    if (file) return useFileImage(file, at);
    const raw = event.dataTransfer.getData("text/estara");
    if (!raw) return;
    let payload: Row;
    try { payload = JSON.parse(raw); } catch { return; }
    if (payload.kind === "image") return placeOrReplaceImage(payload.src, at);
    if (payload.kind === "element") addLibraryElement({ type: payload.type, label: payload.name, patch: payload.patch }, at);
  };
  const duplicate = () => selected && doc && commit({ ...doc, elements: [...doc.elements, { ...selected, id: `${selected.id}-copy-${uid()}`, name: `${selected.name} copy`, x: selected.x + 24, y: selected.y + 24, z: Math.max(...doc.elements.map((x) => x.z), 0) + 1 }] });
  const paste = () => clipboard && doc && commit({ ...doc, elements: [...doc.elements, { ...clipboard, id: `${clipboard.id}-paste-${uid()}`, name: `${clipboard.name} copy`, x: clipboard.x + 30, y: clipboard.y + 30, z: Math.max(...doc.elements.map((x) => x.z), 0) + 1 }] });
  const remove = () => doc && selectedIds.length && commit({ ...doc, elements: doc.elements.filter((item) => !selectedIds.includes(item.id)) }, false);
  const removeLayer = (id: string) => doc && commit({ ...doc, elements: doc.elements.filter((item) => item.id !== id) }, false);
  const copyStyle = () => {
    if (!selected) return;
    const { fill, stroke, radius, fontSize, fontFamily, fontWeight, fontStyle, textDecoration, textTransform, letterSpacing, lineHeight, textEffect, animation, align, color, opacity } = selected;
    setStyleClipboard({ fill, stroke, radius, fontSize, fontFamily, fontWeight, fontStyle, textDecoration, textTransform, letterSpacing, lineHeight, textEffect, animation, align, color, opacity });
  };
  const alignElement = (mode: "top" | "left" | "middle" | "center" | "bottom" | "right") => selected && doc && patchElement(selected.id, {
    x: mode === "left" ? 0 : mode === "center" ? (doc.width - selected.width) / 2 : mode === "right" ? doc.width - selected.width : selected.x,
    y: mode === "top" ? 0 : mode === "middle" ? (doc.height - selected.height) / 2 : mode === "bottom" ? doc.height - selected.height : selected.y,
  });
  const reorderLayer = (id: string, mode: "up" | "down" | "front" | "back") => {
    if (!doc) return;
    const ordered = [...doc.elements].sort((a, b) => a.z - b.z);
    const index = ordered.findIndex((item) => item.id === id);
    if (index < 0) return;
    const next = [...ordered];
    if (mode === "up" && index < next.length - 1) [next[index], next[index + 1]] = [next[index + 1], next[index]];
    if (mode === "down" && index > 0) [next[index], next[index - 1]] = [next[index - 1], next[index]];
    if (mode === "front") next.push(...next.splice(index, 1));
    if (mode === "back") next.unshift(...next.splice(index, 1));
    commit({ ...doc, elements: next.map((item, z) => ({ ...item, z })) });
  };
  const undo = () => setHistory((items) => { const previous = items.at(-1); if (!previous || !doc) return items; setFuture((next) => [doc, ...next.slice(0, 39)]); setDoc(previous); return items.slice(0, -1); });
  const redo = () => setFuture((items) => { const next = items[0]; if (!next || !doc) return items; setHistory((previous) => [...previous.slice(-39), doc]); setDoc(next); return items.slice(1); });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return;
      const mod = event.ctrlKey || event.metaKey;
      if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); remove(); }
      if (mod && event.key.toLowerCase() === "c" && selected) { event.preventDefault(); setClipboard(selected); }
      if (mod && event.key.toLowerCase() === "v" && clipboard) { event.preventDefault(); paste(); }
      if (mod && event.key.toLowerCase() === "d") { event.preventDefault(); duplicate(); }
      if (mod && event.key.toLowerCase() === "z" && !event.shiftKey) { event.preventDefault(); undo(); }
      if (mod && event.key.toLowerCase() === "z" && event.shiftKey) { event.preventDefault(); redo(); }
      if (selected && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault(); const step = event.shiftKey ? 10 : 1;
        patchElement(selected.id, { x: selected.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0), y: selected.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0) });
      }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [doc, selectedIds.join("|")]);

  const point = (event: PointerEvent) => canvasPoint(event);
  const begin = (event: PointerEvent, element: CanvasElement, mode: DragState["mode"], handle?: string) => {
    if (element.locked) return;
    event.stopPropagation(); (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    if (styleClipboard && element.id !== selected?.id) {
      patchElement(element.id, styleClipboard); setStyleClipboard(null); setSelectedIds([element.id]); return;
    }
    setHistory((items) => [...items.slice(-39), doc]); setFuture([]);
    const p = point(event); drag.current = { mode, id: element.id, handle, startX: p.x, startY: p.y, base: element }; setSelectedIds([element.id]);
  };
  const move = (event: PointerEvent) => {
    const d = drag.current; if (!d || !doc) return;
    const p = point(event), dx = p.x - d.startX, dy = p.y - d.startY;
    if (d.mode === "move") patchElement(d.id, { x: d.base.x + dx, y: d.base.y + dy }, false);
    if (d.mode === "resize") {
      const width = Math.max(28, d.base.width + (d.handle?.includes("e") ? dx : d.handle?.includes("w") ? -dx : 0));
      const height = Math.max(22, d.base.height + (d.handle?.includes("s") ? dy : d.handle?.includes("n") ? -dy : 0));
      const patch: Partial<CanvasElement> = { width, height, x: d.handle?.includes("w") ? d.base.x + dx : d.base.x, y: d.handle?.includes("n") ? d.base.y + dy : d.base.y };
      if ((d.base.type === "text" || d.base.type === "propertyField" || d.base.type === "qr") && d.handle && /[ns]/.test(d.handle) && /[ew]/.test(d.handle)) {
        patch.fontSize = Math.max(8, Math.round((d.base.fontSize || 24) * Math.min(width / Math.max(d.base.width, 1), height / Math.max(d.base.height, 1))));
      }
      patchElement(d.id, patch, false);
    }
    if (d.mode === "rotate") patchElement(d.id, { rotation: Math.round(Math.atan2(p.y - (d.base.y + d.base.height / 2), p.x - (d.base.x + d.base.width / 2)) * 180 / Math.PI + 90) }, false);
  };

  async function call(method: string, body: Row, success: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/marketing", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), result = await response.json();
      if (!response.ok) throw new Error(result.error || "That marketing action could not be completed.");
      setMessage(success); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "That marketing action could not be completed."); }
    finally { setBusy(false); }
  }
  const requireProperty = () => {
    if (propertyId) return true;
    setError("Add or select a property before creating fact-bound marketing output.");
    return false;
  };
  const createCopy = () => requireProperty() ? call("POST", { action: "create_copy", propertyId }, "A fact-bound draft is ready to edit.") : Promise.resolve();
  const saveCopy = () => activeCopy ? call("PATCH", { action: "update_copy", id: activeCopy.id, ...copy }, "Copy saved.") : Promise.resolve();
  const renderOutputs = () => requireProperty() ? call("POST", { action: "render", propertyId, formats: [doc?.format || renderFormat], design: doc?.templateId || "signature", designSettings: { designDocument: doc, headlineScale: 100, brandPrimary: data?.agency?.primaryColor } }, "Selected marketing outputs were generated.") : Promise.resolve();
  const refreshBindings = () => {
    const image = property?.photoUrl || property?.media?.[0]?.url || "";
    return doc && commit({ ...doc, elements: doc.elements.map((item) => item.binding === "{{property.image}}" && image ? { ...item, src: image } : item.binding ? { ...item, text: bindValue(item.binding, property, data?.agency) } : item) });
  };
  const chooseProperty = (nextPropertyId: string) => {
    setPropertyId(nextPropertyId); setSelectedIds([]); setHistory([]); setFuture([]); setMessage("Selected property loaded. Bound image and facts will auto-fill until you change them.");
  };
  const applyTemplate = (item: Row) => {
    if (!doc) return;
    setDoc({ ...createDoc(property, data?.agency, item.key, doc.width, doc.height), format: doc.format });
    setSelectedIds([]); setMessage(`${item.name} design applied.`);
  };
  const generateElement = () => {
    const q = search.toLowerCase();
    if (q.includes("line") || q.includes("arrow")) addElement("line", { name: "Generated Line", fill: data?.agency?.primaryColor || "#153b34", width: 190, height: 10 });
    else if (q.includes("circle") || q.includes("badge")) addElement("circle", { name: "Generated Badge", fill: data?.agency?.accentColor || "#e8c45f" });
    else addElement("rectangle", { name: "Generated Shape", fill: data?.agency?.accentColor || "#e8c45f", radius: 18 });
    setMessage("Element added to the canvas.");
  };
  const magicWrite = () => { addElement("text", { name: "Magic Write", text: copy.headline || property?.title || "Premium property marketing", fontSize: 42, fontFamily: "Georgia", fontWeight: "900", color: "#ffffff" }); setMessage("Draft text added to the canvas."); };
  const clearUploads = () => { setStudioUploads([]); try { localStorage.removeItem(uploadKey); } catch {} setMessage("Studio uploads cleared."); };
  const addBackdrop = () => { addElement("rectangle", { name: "Brand Backdrop", fill: data?.agency?.primaryColor || "#153b34", opacity: .35, x: (doc?.width || 1200) * .1, y: (doc?.height || 628) * .1, width: (doc?.width || 1200) * .8, height: (doc?.height || 628) * .8, radius: 28 }); setMessage("Brand backdrop added."); };

  async function downloadPreview() {
    if (!doc) return;
    setError("");
    try {
      const blob = await exportBlob(doc, exportKind);
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = `${doc.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${exportKind}`; link.click(); URL.revokeObjectURL(url); setMessage("Preview downloaded.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Preview export could not be completed."); }
  }
  async function saveExport() {
    if (!doc) return;
    if (!requireProperty()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const blob = await exportBlob(doc, exportKind), dataUrl = await blobToDataUrl(blob);
      const response = await fetch("/api/marketing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save_export", propertyId, format: doc.format || renderFormat, exportKind, dataUrl, design: doc.templateId || "custom-design", designSettings: { designDocument: doc, headlineScale: 100, brandPrimary: data?.agency?.primaryColor, brandAccent: data?.agency?.accentColor } }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Export could not be saved.");
      setMessage(`${exportKind.toUpperCase()} export saved to rendered files.`); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Export could not be saved."); }
    finally { setBusy(false); }
  }
  async function sharePreview() {
    const text = copy.socialCaption || [property?.title, property?.price || money(property), propertyDetails(property), property?.location].filter(Boolean).join("\n");
    try { if (navigator.share) await navigator.share({ title: doc?.name || "Property marketing", text }); else await navigator.clipboard.writeText(text); setMessage(navigator.share ? "Share sheet opened." : "Caption copied for sharing."); }
    catch { setError("Sharing was cancelled or unavailable."); }
  }

  if (!data || !doc) return <main className="studio-empty"><section><div className="studio-loading-mark"><span /><span /><span /></div><p>{platform.shortName}</p><h1>{error || "Opening Marketing Studio"}</h1><div className="studio-loading-preview"><i /><i /><i /></div>{error && <button onClick={load}>Retry</button>}</section></main>;

  const themeVars: StudioThemeVars = { "--studio-brand": platform.primaryColor || "#153b34", "--studio-accent": platform.accentColor || "#e6bd5f" };

  return <main className="studio-page" style={themeVars}>
    <header className="studio-topbar">
      <a href="/workspace">Workspace</a><input aria-label="Design name" value={doc.name} onChange={(e) => commit({ ...doc, name: e.target.value })} />
      <select aria-label="Working property" value={propertyId} onChange={(e) => chooseProperty(e.target.value)}>{!data.properties.length && <option value="">No properties yet</option>}{data.properties.map((item: Row) => <option value={item.id} key={item.id}>{item.reference} - {item.title}</option>)}</select>
      <span className={`studio-save ${saveState.replace(/\W/g, "").toLowerCase()}`}>{platform.shortName} · {saveState}</span>
      <button className="studio-icon-action" aria-label="Undo" onClick={undo} disabled={!history.length}>↶</button><button className="studio-icon-action" aria-label="Redo" onClick={redo} disabled={!future.length}>↷</button>
      <select aria-label="Resize design" value={doc.format || renderFormat} onChange={(e) => { const spec = presetSizes.find((item) => item.key === e.target.value); if (!spec) return; setRenderFormat(spec.key); commit({ ...doc, format: spec.key, width: spec.width, height: spec.height, elements: doc.elements.map((item) => ({ ...item, x: item.x * spec.width / doc.width, y: item.y * spec.height / doc.height, width: item.width * spec.width / doc.width, height: item.height * spec.height / doc.height })) }); }}>{presetSizes.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select>
      <select aria-label="Export file type" value={exportKind} onChange={(e) => setExportKind(e.target.value as "png" | "jpg" | "svg")}><option value="png">PNG</option><option value="jpg">JPEG</option><option value="svg">SVG</option></select>
      <button className="studio-export-action" onClick={downloadPreview}>Download</button><button className="studio-export-action" onClick={saveExport} disabled={busy}>Save export</button><button className="studio-export-action" onClick={sharePreview}>Share</button>
      <details className="studio-mobile-export-menu"><summary>Export</summary><div><button onClick={downloadPreview}>Download</button><button onClick={saveExport} disabled={busy}>Save export</button><button onClick={sharePreview}>Share</button></div></details>
    </header>
    {error && <p className="studio-error">{error}</p>}{message && <p className="studio-message">{message}</p>}
    <section className="studio-editor-shell">
      <nav className="studio-rail">{rail.map((item) => <button className={tool === item.name ? "active" : ""} onClick={() => setTool(item.name)} key={item.name} aria-label={item.name}><b>{item.icon}</b><span>{item.name}</span></button>)}</nav>
      <aside className={`studio-left-panel ${mobileToolsOpen ? "open" : ""}`}><span>DESIGN TOOLS</span><div className="studio-mobile-panel-head"><div><small>Studio tools</small><strong>{tool}</strong></div><div className="studio-mobile-history"><button aria-label="Undo" onClick={undo} disabled={!history.length}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 7H4v5" /><path d="M4 12c1.8-3.4 5-5 8.2-4.6 3.8.5 6.5 3.4 6.8 7.1.2 2.2-.5 4.2-1.8 5.7" /></svg></button><button aria-label="Redo" onClick={redo} disabled={!future.length}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 7h5v5" /><path d="M20 12c-1.8-3.4-5-5-8.2-4.6-3.8.5-6.5 3.4-6.8 7.1-.2 2.2.5 4.2 1.8 5.7" /></svg></button><button className="studio-mobile-tools-close" onClick={() => setMobileToolsOpen(false)} aria-label="Close toolbar">×</button></div></div><h2>{tool}</h2><div className="studio-mobile-tool-tabs">{rail.map((item) => <button className={tool === item.name ? "active" : ""} onClick={() => { setTool(item.name); setMobileToolsOpen(true); }} key={item.name}><b>{item.icon}</b><span>{item.name}</span></button>)}</div>
        {tool === "Templates" && <><div className="studio-command"><b>+</b><input placeholder="Describe your ideal design" value={search} onChange={(e) => setSearch(e.target.value)} /><button aria-label="Clear search" onClick={() => setSearch("")}>×</button></div><div className="studio-ai-row"><button onClick={() => templates[0] && applyTemplate(templates[0])}>✦ Generate</button><button onClick={() => setMessage(`${templates.length} design templates found.`)}>Search</button></div><div className="studio-panel-section"><header><strong>Recently used</strong><button onClick={() => setSearch("")}>See all</button></header><div className="studio-template-grid">{templates.slice(0, 2).map((item) => <button aria-label={`Apply ${item.name}`} key={item.key} onClick={() => applyTemplate(item)}><span className={`template-thumb template-${item.key}`}><img src={item.image} alt="" /><b>{item.name.split(" ")[0]}</b><em>{item.category}</em><i /></span></button>)}</div></div><div className="studio-panel-section"><header><strong>More templates for you</strong><button onClick={() => setSearch("")}>See all</button></header><div className="studio-template-grid">{templates.slice(2).map((item) => <button aria-label={`Apply ${item.name}`} key={item.key} onClick={() => applyTemplate(item)}><span className={`template-thumb template-${item.key}`}><img src={item.image} alt="" /><b>{item.name.split(" ")[0]}</b><em>{item.category}</em><i /></span></button>)}</div></div></>}
        {tool === "Elements" && <div className="studio-tool-panel">{elementCategory ? <><div className="studio-panel-title"><button aria-label="Back to element categories" onClick={() => setElementCategory("")}>←</button><strong>{elementCategories.find((item) => item.key === elementCategory)?.name}</strong></div><div className="studio-command"><b>+</b><input placeholder="Describe your ideal element" value={search} onChange={(e) => setSearch(e.target.value)} /><button aria-label="Clear search" onClick={() => setSearch("")}>×</button></div><div className="studio-ai-row"><button onClick={generateElement}>✦ Generate</button><button onClick={() => setMessage(`${elementCategory} library ready. Drag or click an item to add it.`)}>Search</button></div>{(elementLibraries[elementCategory] || []).map((group: Row) => <div className="studio-panel-section" key={group.title}><header><strong>{group.title}</strong><button onClick={() => setMessage(`${group.title} has ${group.items.length} items.`)}>See all</button></header><div className="studio-element-library">{group.items.map((item: Row) => <button draggable aria-label={`Add ${item.label}`} onDragStart={(e) => dragStudioItem(e, { kind: "element", type: item.type, name: item.label, patch: item.patch })} key={`${group.title}-${item.label}-${item.icon}`} onClick={() => addLibraryElement(item)}><span>{item.icon}</span><small>{item.label}</small></button>)}</div></div>)}</> : <><div className="studio-command"><b>+</b><input placeholder="Describe your ideal element" value={search} onChange={(e) => setSearch(e.target.value)} /><button aria-label="Clear search" onClick={() => setSearch("")}>×</button></div><div className="studio-ai-row"><button onClick={generateElement}>✦ Generate</button><button onClick={() => setMessage("Element library ready. Choose a category, then drag or click an item.")}>Search</button></div><div className="studio-panel-section"><header><strong>Recently used</strong><button onClick={() => setSearch("")}>See all</button></header><div className="studio-recent-row"><button draggable onDragStart={(e) => dragStudioItem(e, { kind: "element", type: "rectangle", name: "Rectangle" })} onClick={() => addElement("rectangle")} /><button draggable onDragStart={(e) => dragStudioItem(e, { kind: "element", type: "rectangle", name: "Dark Block", patch: { fill: "#202933" } })} className="dark" onClick={() => addElement("rectangle", { fill: "#202933" })} /><button draggable onDragStart={(e) => dragStudioItem(e, { kind: "element", type: "line", name: "Line" })} className="line" onClick={() => addElement("line")} /></div></div><div className="studio-panel-section"><header><strong>Browse categories</strong></header><div className="studio-category-grid">{elementCategories.map((item) => <button className={`tone-${item.tone}`} key={item.key} onClick={() => setElementCategory(item.key)}><b>{item.icon}</b><span>{item.name}</span></button>)}</div></div></>}</div>}
        {tool === "Text" && <div className="studio-tool-panel"><div className="studio-command studio-search-command"><b>⌕</b><input placeholder="Search fonts and combinations" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="studio-action-stack"><button className="studio-primary-action" onClick={() => addElement("text", { text: "Add your text", fontSize: 44, lineHeight: 1.08, color: "#ffffff" })}>T&nbsp;&nbsp; Add a text box</button><button className="studio-secondary-action" onClick={magicWrite}>✧ Magic Write</button></div><div className="studio-panel-section"><header><strong>Font combinations</strong><button onClick={() => setSearch("")}>See all</button></header><div className="studio-font-grid">{textCombinations.map((item) => <button className={`text-layout-${item.style}`} key={item.name} onClick={() => addElement("text", { name: item.name, text: item.text, fontFamily: item.font, fontWeight: item.weight, fontStyle: item.fontStyle, textEffect: item.effect, letterSpacing: item.letterSpacing || 0, color: item.color, fontSize: item.size, lineHeight: item.lineHeight })} style={{ color: item.color, fontFamily: item.font, fontWeight: item.weight, fontStyle: item.fontStyle, letterSpacing: item.letterSpacing }}>{item.text}</button>)}</div></div></div>}
        {tool === "Effects" && selectedIsText && <><div className="studio-panel-title"><strong>Effects</strong><button aria-label="Close effects panel" onClick={() => setTool("Text")}>×</button></div><div className="studio-effect-grid">{textEffects.map((effect) => <button className={selected?.textEffect === effect.value ? "active" : ""} key={effect.value} onClick={() => selected && patchElement(selected.id, { textEffect: effect.value })}><b>Ag</b><span>{effect.name}</span></button>)}</div><div className="studio-panel-section"><header><strong>Shape</strong></header><div className="studio-effect-grid compact"><button className={selected?.textEffect === "curve" ? "active" : ""} onClick={() => selected && patchElement(selected.id, { textEffect: "curve" })}><b>ABCD</b><span>Curve</span></button></div></div><div className="studio-panel-section"><header><strong>Advanced</strong></header><div className="studio-effect-grid">{advancedTextEffects.map((effect) => <button className={selected?.textEffect === effect.value ? "active" : ""} key={effect.value} onClick={() => selected && patchElement(selected.id, { textEffect: effect.value })}><b>Ag</b><span>{effect.name}</span></button>)}</div></div></>}
        {tool === "Effects" && !selectedIsText && <><div className="studio-panel-title"><strong>Effects</strong><button aria-label="Close effects panel" onClick={() => setTool("Templates")}>×</button></div><p>Select a text element to edit text effects.</p></>}
        {tool === "Animate" && selected && <><div className="studio-panel-title"><strong>Animate</strong><button aria-label="Close animate panel" onClick={() => setTool(selectedIsText ? "Text" : "Templates")}>×</button></div><div className="studio-panel-tabs"><button onClick={() => setMessage("Page animation controls are ready for the selected design.")}>Page</button><button className="active" onClick={() => setMessage("Element animation controls are active.")}>Text</button></div><div className="studio-panel-section"><header><strong>Presentation settings</strong></header><label className="studio-switch">Appear on click<input type="checkbox" /></label></div><button className="studio-animation-builder" onClick={() => patchElement(selected.id, { animation: "Custom" })}><b>✦</b><span><strong>Create an Animation</strong><small>Drag elements around the canvas to create your own animations.</small></span></button><div className="studio-panel-section"><header><strong>Suggested</strong></header><div className="studio-effect-grid animation-grid">{textAnimations.map((name) => <button className={selected.animation === name ? "active" : ""} key={name} onClick={() => patchElement(selected.id, { animation: name })}><b>ABC</b><span>{name}</span></button>)}</div></div></>}
        {tool === "Position" && selected && <><div className="studio-panel-title"><strong>Position</strong><button aria-label="Close position panel" onClick={() => setTool(selectedIsText ? "Text" : "Templates")}>×</button></div><div className="studio-panel-tabs"><button className="active" onClick={() => setMessage("Arrange controls are active.")}>Arrange</button><button onClick={() => setTool("Layers")}>Layers</button></div><div className="studio-arrange-grid"><button onClick={() => reorderLayer(selected.id, "up")}>⇧ Forward</button><button onClick={() => reorderLayer(selected.id, "down")}>⇩ Backward</button><button onClick={() => reorderLayer(selected.id, "front")}>⇱ To front</button><button onClick={() => reorderLayer(selected.id, "back")}>⇲ To back</button></div><div className="studio-panel-section"><header><strong>Align to page</strong></header><div className="studio-arrange-grid"><button onClick={() => alignElement("top")}>▔ Top</button><button onClick={() => alignElement("left")}>▏ Left</button><button onClick={() => alignElement("middle")}>─ Middle</button><button onClick={() => alignElement("center")}>┼ Center</button><button onClick={() => alignElement("bottom")}>▁ Bottom</button><button onClick={() => alignElement("right")}>▕ Right</button></div></div><div className="studio-panel-section"><header><strong>Advanced</strong></header><div className="studio-position-grid"><label>Width<input value={`${selected.width.toFixed(1)} px`} onChange={(e) => patchElement(selected.id, { width: Math.max(1, Number(e.target.value.replace(/[^\d.]/g, "")) || selected.width) })} /></label><label>Height<input value={`${selected.height.toFixed(1)} px`} onChange={(e) => patchElement(selected.id, { height: Math.max(1, Number(e.target.value.replace(/[^\d.]/g, "")) || selected.height) })} /></label><label>Ratio<button type="button">⌘</button></label><label>X<input value={`${selected.x.toFixed(1)} px`} onChange={(e) => patchElement(selected.id, { x: Number(e.target.value.replace(/[^\d.-]/g, "")) || 0 })} /></label><label>Y<input value={`${selected.y.toFixed(1)} px`} onChange={(e) => patchElement(selected.id, { y: Number(e.target.value.replace(/[^\d.-]/g, "")) || 0 })} /></label><label>Rotate<input value={`${selected.rotation}°`} onChange={(e) => patchElement(selected.id, { rotation: Number(e.target.value.replace(/[^\d.-]/g, "")) || 0 })} /></label></div></div></>}
        {tool === "Uploads" && <div className="studio-tool-panel"><div className="studio-command studio-search-command"><b>⌕</b><input placeholder="Search keywords, tags, color" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="studio-upload-actions"><button onClick={() => imageInputRef.current?.click()}>Upload files</button><button aria-label="Clear studio uploads" onClick={clearUploads}>×</button></div><div className="studio-tabs"><button className="active" onClick={() => setMessage(`${galleryPhotos.length} images available.`)}>Images</button><button onClick={() => setMessage("Folders will appear when connected asset folders are available.")}>Folders</button></div><p className="studio-panel-note">Drag an image onto the canvas or click one to replace the selected image.</p><div className="studio-masonry">{galleryPhotos.map((photo: Row, index: number) => <button draggable onDragStart={(e) => dragStudioItem(e, { kind: "image", src: photo.url })} className={index % 3 === 0 ? "wide" : ""} key={photo.id} onClick={() => selected ? patchElement(selected.id, { src: photo.url, type: "image", binding: undefined }) : addElement("image", { src: photo.url, width: doc.width * .38, height: doc.height * .5 })}><img src={photo.url} alt="" /></button>)}</div></div>}
        {tool === "Tools" && <div className="studio-tool-panel"><div className="studio-property-card"><small>Working property</small><select value={propertyId} onChange={(e) => chooseProperty(e.target.value)}>{!data.properties.length && <option value="">No properties yet</option>}{data.properties.map((item: Row) => <option value={item.id} key={item.id}>{item.reference} - {item.title}</option>)}</select><button onClick={refreshBindings} disabled={!propertyId}>Refresh property data</button><p>{propertyId ? "Bound fields auto-fill from this property until you edit the element yourself." : "Add a property in the workspace to create fact-bound copy, renders and saved exports."}</p></div><div className="studio-panel-section"><header><strong>Property fields</strong></header><div className="studio-chip-grid">{["{{property.title}}", "{{property.price}}", "{{property.suburb}}", "{{property.bedrooms}}", "{{agent.phone}}"].map((binding) => <button key={binding} onClick={() => addElement("propertyField", { binding, text: bindValue(binding, property, data.agency), name: binding })}>{binding}</button>)}</div></div></div>}
        {tool === "Brand" && <div className="studio-tool-panel"><div className="studio-brand-card"><small>Brand kit</small><strong>{data.agency?.name || platform.shortName}</strong><p>{[data.agency?.phone, data.agency?.email].filter(Boolean).join(" · ")}</p></div><div className="studio-swatch-grid"><button onClick={() => selected && patchElement(selected.id, { fill: data.agency?.primaryColor, color: data.agency?.primaryColor })}><i style={{ background: data.agency?.primaryColor || platform.primaryColor }} />Apply primary</button><button onClick={() => selected && patchElement(selected.id, { fill: data.agency?.accentColor, color: data.agency?.accentColor })}><i style={{ background: data.agency?.accentColor || platform.accentColor }} />Apply accent</button></div><p className="studio-panel-note">Select a text, shape, or badge first, then apply a brand color.</p></div>}
        {tool === "Projects" && <div className="studio-panel-section"><header><strong>Recent designs</strong></header><div className="studio-project-card"><b>{doc.name}</b><small>{doc.width} x {doc.height} · saved locally</small></div></div>}
        {tool === "Apps" && <div className="studio-category-grid"><button onClick={sharePreview}><b>↗</b><span>Share kit</span></button><button onClick={() => { const spec = presetSizes.find((item) => item.key === "flyer"); if (spec) { setRenderFormat(spec.key); commit({ ...doc, format: spec.key, width: spec.width, height: spec.height, elements: doc.elements.map((item) => ({ ...item, x: item.x * spec.width / doc.width, y: item.y * spec.height / doc.height, width: item.width * spec.width / doc.width, height: item.height * spec.height / doc.height })) }); } }}><b>▤</b><span>Flyer</span></button><button onClick={createCopy}><b>◎</b><span>Campaign</span></button><button onClick={() => setTool("QR Code")}><b>▦</b><span>QR tools</span></button></div>}
        {tool === "Magic Media" && <div className="studio-tool-panel"><div className="studio-media-card"><b>✦</b><div><strong>Image studio</strong><p>Create a polished placeholder or branded backdrop, then replace it with agency media whenever ready.</p></div></div><div className="studio-command studio-search-command"><b>⌕</b><input placeholder="Describe property image style" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="studio-action-stack"><button className="studio-primary-action" onClick={() => placeOrReplaceImage(samplePhoto(Math.floor(Math.random() * designOptions.length)))}>Generate image</button><button className="studio-secondary-action" onClick={addBackdrop}>Add brand backdrop</button></div></div>}
        {tool === "QR Code" && <><button onClick={() => addElement("qr")}>Add property QR code</button><p>QR codes remain movable and resizable design elements.</p></>}
        {tool === "Layers" && <div className="studio-layer-list" aria-label="Canvas layers">{[...doc.elements].sort((a, b) => b.z - a.z).map((item) => {
          const active = selectedIds.includes(item.id);
          return <article key={item.id} className={active ? "active" : ""}>
            <button onClick={() => setSelectedIds([item.id])}><b>{item.type.slice(0, 1).toUpperCase()}</b><span>{item.name}<small>{item.visible ? "Visible" : "Hidden"} · {item.locked ? "Locked" : "Editable"}</small></span></button>
            {active && <div><button aria-label="Move layer up" onClick={() => reorderLayer(item.id, "up")}>Up</button><button aria-label="Move layer down" onClick={() => reorderLayer(item.id, "down")}>Down</button><button aria-label="Bring layer to front" onClick={() => reorderLayer(item.id, "front")}>Front</button><button aria-label="Send layer to back" onClick={() => reorderLayer(item.id, "back")}>Back</button><button className="layer-delete" aria-label="Delete layer" onClick={() => removeLayer(item.id)}>Delete</button></div>}
          </article>;
        })}</div>}
      </aside>
      <section className="studio-workspace">
        <div className="studio-workbar">
          <button className="studio-mobile-tools-toggle" onClick={() => setMobileToolsOpen((open) => !open)}>{mobileToolsOpen ? "Close toolbar" : "Toolbar"}</button><span className="studio-selection-status">{selected ? `${selected.name} · Layer ${selectedLayerIndex}` : "LIVE PREVIEW"}</span>
          {selected && <div className={`studio-context-toolbar ${selectedIsText ? "text-toolbar" : "asset-toolbar"}`} aria-label="Selected element actions">
            <button aria-label="More options" onClick={() => setTool("Layers")}>☰</button><button aria-label="Undo style" onClick={undo} disabled={!history.length}>⌒</button>
            {selectedIsText && <><select aria-label="Font family" value={selected.fontFamily || "Arial"} onChange={(e) => patchElement(selected.id, { fontFamily: e.target.value })}><option>Open Sauce</option><option>Boston Angel</option><option>Arial</option><option>Georgia</option><option>Inter</option></select><button aria-label="Decrease text size" onClick={() => patchElement(selected.id, { fontSize: Math.max(8, (selected.fontSize || 24) - 1) })}>−</button><input aria-label="Text size" type="number" min="8" max="160" value={selected.fontSize || 24} onChange={(e) => patchElement(selected.id, { fontSize: Number(e.target.value) })} /><button aria-label="Increase text size" onClick={() => patchElement(selected.id, { fontSize: Math.min(160, (selected.fontSize || 24) + 1) })}>+</button><input className="studio-color-swatch" aria-label="Colour" type="color" value={selected.color || data.agency?.primaryColor || "#153b34"} onChange={(e) => patchElement(selected.id, { color: e.target.value })} /><button className={selected.fontWeight === "900" ? "active" : ""} aria-label="Bold" onClick={() => patchElement(selected.id, { fontWeight: selected.fontWeight === "900" ? "500" : "900" })}>B</button><button className={selected.fontStyle === "italic" ? "active" : ""} aria-label="Italic" onClick={() => patchElement(selected.id, { fontStyle: selected.fontStyle === "italic" ? "" : "italic" })}>I</button><button className={selected.textDecoration === "underline" ? "active" : ""} aria-label="Underline" onClick={() => patchElement(selected.id, { textDecoration: selected.textDecoration === "underline" ? "" : "underline" })}>U</button><button className={selected.textDecoration === "line-through" ? "active" : ""} aria-label="Strikethrough" onClick={() => patchElement(selected.id, { textDecoration: selected.textDecoration === "line-through" ? "" : "line-through" })}>S</button><button className={selected.textTransform === "uppercase" ? "active" : ""} aria-label="Letter case" onClick={() => patchElement(selected.id, { textTransform: selected.textTransform === "uppercase" ? "none" : "uppercase" })}>aA</button><button aria-label="Text alignment" onClick={() => patchElement(selected.id, { align: selected.align === "center" ? "left" : selected.align === "right" ? "center" : "right" })}>≡</button><button aria-label="List" onClick={() => patchElement(selected.id, { text: selected.text?.split("\n").map((line) => line.startsWith("• ") ? line.slice(2) : `• ${line}`).join("\n"), binding: undefined })}>☷</button><button aria-label="Letter spacing" onClick={() => patchElement(selected.id, { letterSpacing: selected.letterSpacing ? 0 : 1.5 })}>↔</button><button aria-label="Line height" onClick={() => patchElement(selected.id, { lineHeight: selected.lineHeight && selected.lineHeight > 1.12 ? 1 : 1.22 })}>↕</button><button className={tool === "Effects" ? "active wide" : "wide"} onClick={() => setTool("Effects")}>Effects</button><button className={tool === "Animate" ? "active wide" : "wide"} onClick={() => setTool("Animate")}>Animate</button><button className={tool === "Position" ? "active wide" : "wide"} onClick={() => setTool("Position")}>Position</button></>}
            {!selectedIsText && <>{selectedIsImage && <button className="wide" onClick={() => imageInputRef.current?.click()}>Change image</button>}<input className="studio-color-swatch" aria-label="Colour" type="color" value={selected.fill || selected.color || data.agency?.primaryColor || "#153b34"} onChange={(e) => patchElement(selected.id, { fill: e.target.value })} /><label>Opacity<input aria-label="Opacity" type="range" min="0" max="100" value={Math.round(selected.opacity * 100)} onChange={(e) => patchElement(selected.id, { opacity: Number(e.target.value) / 100 })} /></label><button className={tool === "Animate" ? "active wide" : "wide"} onClick={() => setTool("Animate")}>Animate</button><button className={tool === "Position" ? "active wide" : "wide"} onClick={() => setTool("Position")}>Position</button></>}
            <button className={`style-brush ${styleClipboard ? "active" : ""}`} aria-label="Copy style" title="Copy style" data-tooltip="Copy style" onClick={copyStyle}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15.7 3.4c.9-.9 2.3-.9 3.2 0l1.7 1.7c.9.9.9 2.3 0 3.2l-7.4 7.4-4.9-4.9 7.4-7.4Z" /><path d="M7.6 12.2 4.9 15c-.8.8-1.2 1.9-1.2 3v1.6h1.6c1.1 0 2.2-.4 3-1.2l2.7-2.7" /></svg></button>
          </div>}
          <div className="studio-zoom-controls"><button aria-label="Zoom out" onClick={() => setZoom(Math.max(.25, zoom - .1))}>−</button><select aria-label="Zoom" value={String(Math.round(effectiveZoom * 100))} onChange={(e) => setZoom(Number(e.target.value) / 100)}>{[25, 50, 75, 100, 125, 150, 200].map((v) => <option key={v} value={v}>{v}%</option>)}</select><button aria-label="Zoom in" onClick={() => setZoom(Math.min(2, zoom + .1))}>+</button><button onClick={() => setSelectedIds([])}>Preview</button></div>
        </div>
        <input ref={imageInputRef} className="studio-hidden-file" aria-label="Change image" type="file" accept="image/*" onChange={changeImage} />
        <div className="studio-stage" onDragOver={(e) => e.preventDefault()} onDrop={dropOnCanvas} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
          <div className="studio-artboard" style={{ width: doc.width * effectiveZoom, height: doc.height * effectiveZoom }} onPointerDown={() => setSelectedIds([])}>
            <div ref={canvasRef} className="studio-canvas studio-layout-document" style={{ width: doc.width, height: doc.height, transform: `scale(${effectiveZoom})` }}>
              {[...doc.elements].filter((item) => item.visible).sort((a, b) => a.z - b.z).map((item) => <CanvasObject key={item.id} element={item} selected={selectedIds.includes(item.id)} begin={begin} patch={patchElement} editing={editingText === item.id} setEditing={setEditingText} />)}
            </div>
          </div>
        </div>
      </section>
      <div className="studio-mobile-toolbar"><button onClick={() => { setTool("Templates"); setMobileToolsOpen(true); }}>Templates</button><button onClick={() => { setTool("Uploads"); setMobileToolsOpen(true); }}>Uploads</button><button onClick={() => { setTool("Text"); setMobileToolsOpen(true); }}>Text</button><button onClick={duplicate} disabled={!selected}>Duplicate</button><button onClick={remove} disabled={!selected}>Delete</button></div>
    </section>
    <section className="studio-copy studio-editor"><div><span>EDITABLE COPY</span><h2>Approved facts, polished wording</h2>{!activeCopy && <button onClick={createCopy} disabled={busy || !property}>Draft from verified facts</button>}</div>{activeCopy ? <div className="studio-copy-editor"><label>Headline<input value={copy.headline} onChange={(e) => setCopy({ ...copy, headline: e.target.value })} /></label><label>Listing description<textarea value={copy.listingDescription} onChange={(e) => setCopy({ ...copy, listingDescription: e.target.value })} /></label><label>Social caption<textarea value={copy.socialCaption} onChange={(e) => setCopy({ ...copy, socialCaption: e.target.value })} /></label><footer><em>{activeCopy.status}</em><button onClick={saveCopy} disabled={busy}>Save edits</button><button onClick={() => call("PATCH", { action: "approve_copy", id: activeCopy.id }, "Copy approved for rendering.")} disabled={busy}>Approve copy</button><button className="studio-generate" onClick={renderOutputs} disabled={busy}>Render approved outputs</button></footer></div> : <div className="studio-blank">No marketing copy exists yet. Draft it from the selected property facts.</div>}</section>
    <section className="studio-output"><div><span>RENDERED FILES</span><h2>Ready to publish</h2></div><div className="studio-cards">{jobs.length ? jobs.map((job: Row) => <article key={`${job.id}-${job.outputId || job.kind || "pending"}`}><header><span>{job.kind || job.format}</span><em>{job.status}</em></header>{job.outputId ? <a href={`/api/marketing/output?id=${encodeURIComponent(job.outputId)}`} target="_blank" rel="noreferrer">Open saved file</a> : <div>{job.lastError || "Output is queued."}</div>}</article>) : <div className="studio-blank">Save PNG, JPEG or SVG exports, or render approved PDF outputs.</div>}</div></section>
  </main>;
}

function CanvasObject({ element, selected, begin, patch, editing, setEditing }: { element: CanvasElement; selected: boolean; begin: (event: PointerEvent, element: CanvasElement, mode: DragState["mode"], handle?: string) => void; patch: (id: string, patch: Partial<CanvasElement>) => void; editing: boolean; setEditing: (id: string) => void }) {
  const style = { left: element.x, top: element.y, width: element.width, height: element.height, opacity: element.opacity, transform: `rotate(${element.rotation}deg)`, zIndex: element.z } as any;
  return <div className={`studio-object ${selected ? "selected" : ""} ${element.locked ? "locked" : ""}`} style={style} onPointerDown={(e) => begin(e, element, "move")} onDoubleClick={() => setEditing(element.id)}>
    {element.type === "image" || element.type === "logo" ? <img src={element.src} alt="" /> : element.type === "circle" ? <div className="shape circle" style={{ background: element.fill, borderColor: element.stroke }} /> : element.type === "line" ? <div className="shape line" style={{ background: element.fill }} /> : element.type === "rectangle" ? <div className="shape" style={{ background: element.fill, borderColor: element.stroke, borderRadius: element.radius }} /> : <div className={`text ${editing ? "editing" : ""} effect-${element.textEffect || "none"}`} contentEditable={editing} suppressContentEditableWarning onBlur={(e) => patch(element.id, { text: e.currentTarget.textContent || "", binding: undefined })} style={{ fontSize: element.fontSize, fontFamily: element.fontFamily, fontWeight: element.fontWeight, fontStyle: element.fontStyle, textDecoration: element.textDecoration, textTransform: element.textTransform === "uppercase" ? "uppercase" : "none", letterSpacing: element.letterSpacing, lineHeight: element.lineHeight || 1.05, color: element.color, textAlign: element.align }}>{element.type === "qr" ? "QR" : element.text}</div>}
    {selected && <>{["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((handle) => <button key={handle} className={`handle ${handle}`} onPointerDown={(e) => begin(e, element, "resize", handle)} aria-label={`Resize ${handle}`} />)}<button className="handle rotate" onPointerDown={(e) => begin(e, element, "rotate")} aria-label="Rotate handle" /></>}
  </div>;
}

async function exportBlob(doc: DesignDocument, kind: "png" | "jpg" | "svg") {
  const prepared = await inlineExportImages(doc);
  const svg = marketingDocumentToSvg(prepared);
  if (kind === "svg") return new Blob([svg], { type: "image/svg+xml" });
  return rasterizeDocument(prepared, kind);
}

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = reject; reader.readAsDataURL(blob); });
const fallbackImage = (width: number, height: number) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(1, Math.round(width))}" height="${Math.max(1, Math.round(height))}" viewBox="0 0 ${Math.max(1, Math.round(width))} ${Math.max(1, Math.round(height))}"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#153b34"/><stop offset="1" stop-color="#e6bd5f"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};
async function inlineExportImages(doc: DesignDocument): Promise<DesignDocument> {
  const cache = new Map<string, string>();
  const elements = await Promise.all(doc.elements.map(async (item) => {
    if (!["image", "logo"].includes(item.type) || !item.src || item.src.startsWith("data:")) return item;
    if (cache.has(item.src)) return { ...item, src: cache.get(item.src) };
    try {
      const response = await fetch(item.src, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Image source could not be fetched.");
      const dataUrl = await blobToDataUrl(await response.blob());
      cache.set(item.src, dataUrl);
      return { ...item, src: dataUrl };
    } catch {
      const dataUrl = fallbackImage(item.width, item.height);
      cache.set(item.src, dataUrl);
      return { ...item, src: dataUrl };
    }
  }));
  return { ...doc, elements };
}

const loadCanvasImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error("Image layer could not be prepared."));
  image.src = src;
});
function drawCoverImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale, sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2, sourceY = (image.naturalHeight - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}
function textLines(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  for (const paragraph of String(text || "").split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && context.measureText(next).width > width) { lines.push(line); line = word; }
      else line = next;
    }
    lines.push(line || "");
  }
  return lines;
}
async function rasterizeDocument(doc: DesignDocument, kind: "png" | "jpg") {
  const canvas = document.createElement("canvas"); canvas.width = doc.width; canvas.height = doc.height;
  const context = canvas.getContext("2d"); if (!context) throw new Error("Preview export is unavailable in this browser.");
  if (kind === "jpg") { context.fillStyle = "#ffffff"; context.fillRect(0, 0, doc.width, doc.height); }
  for (const item of [...doc.elements].filter((layer) => layer.visible !== false).sort((a, b) => a.z - b.z)) {
    const x = item.x || 0, y = item.y || 0, width = Math.max(1, item.width || 1), height = Math.max(1, item.height || 1);
    context.save();
    context.globalAlpha = Math.max(0, Math.min(1, item.opacity ?? 1));
    context.translate(x + width / 2, y + height / 2);
    context.rotate(((item.rotation || 0) * Math.PI) / 180);
    context.translate(-width / 2, -height / 2);
    if ((item.type === "image" || item.type === "logo") && item.src) {
      try { drawCoverImage(context, await loadCanvasImage(item.src), 0, 0, width, height); } catch {}
    } else if (item.type === "circle") {
      context.fillStyle = item.fill || "#e8c45f"; context.beginPath(); context.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2); context.fill();
    } else if (item.type === "rectangle" || item.type === "line") {
      context.fillStyle = item.fill || "#103b32";
      const radius = Math.min(Number(item.radius || 0), width / 2, height / 2);
      context.beginPath(); context.roundRect(0, 0, width, height, radius); context.fill();
    } else {
      const fontSize = Number(item.fontSize || 24), lineHeight = fontSize * Number(item.lineHeight || 1.05);
      context.fillStyle = item.color || "#ffffff";
      context.font = `${item.fontStyle || ""} ${item.fontWeight || "700"} ${fontSize}px ${item.fontFamily || "Arial"}`.trim();
      context.textAlign = item.align || "left";
      context.textBaseline = "top";
      const anchorX = item.align === "center" ? width / 2 : item.align === "right" ? width : 0;
      for (const [index, line] of textLines(context, item.type === "qr" ? "QR" : item.text || "", width).entries()) {
        const lineY = index * lineHeight;
        if (lineY > height) break;
        context.fillText(item.textTransform === "uppercase" ? line.toUpperCase() : line, anchorX, lineY);
      }
    }
    context.restore();
  }
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Preview export failed.")), kind === "png" ? "image/png" : "image/jpeg", .92));
}

async function rasterizeSvg(svg: string, width: number, height: number, kind: "png" | "jpg") {
  const image = new Image(), url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Preview image could not be prepared.")); image.src = url; });
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("Preview export is unavailable in this browser.");
    if (kind === "jpg") { context.fillStyle = "#ffffff"; context.fillRect(0, 0, width, height); }
    context.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Preview export failed.")), kind === "png" ? "image/png" : "image/jpeg", .92));
  } finally {
    URL.revokeObjectURL(url);
  }
}
