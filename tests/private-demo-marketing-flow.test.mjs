import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("workspace is private while demo is intentional and public", async () => {
  const [workspace, demo, demoClient, error, home] = await Promise.all([
    read("app/workspace/page.tsx"),
    read("app/demo/page.tsx"),
    read("app/demo/demo-client.tsx"),
    read("app/error.tsx"),
    read("app/page.tsx"),
  ]);
  assert.match(workspace, /requireChatGPTUser\("\/workspace"\)/);
  assert.match(demo, /DemoExperience/);
  assert.match(demoClient, /sample data only/i);
  assert.match(demoClient, /Start your real workspace/);
  assert.match(demoClient, /setModule/);
  assert.doesNotMatch(error, /href="\/workspace"/);
  assert.match(error, /href="\/login"/);
  assert.match(home, /href="\/demo"/);
});

test("marketing studio supports editable design workflow and durable renders", async () => {
  const [client, css, route, renderer] = await Promise.all([
    read("app/marketing-studio/studio-client.tsx"),
    read("app/marketing-studio/studio.css"),
    read("app/api/marketing/route.ts"),
    read("db/marketing-render.ts"),
  ]);
  for (const marker of [
    "designOptions",
    "images.unsplash.com",
    "editorial-split",
    "prestige-cover",
    "bold-panel",
    "rental-spotlight",
    "sold-celebration",
    "auction-countdown",
    "commercial-lease",
    "land-opportunity",
    "development-launch",
    "agent-feature",
    "valuation-offer",
    "price-improvement",
    "neighbourhood-guide",
    "mandate-announcement",
    "holiday-stay",
    "aria-label={`Apply ${item.name}`}",
    "schemaVersion",
    "studio-editor-shell",
    "studio-rail",
    "Resize design",
    "Zoom out",
    "Zoom in",
    "Rotate handle",
    "contentEditable",
    "setPointerCapture",
    "Refresh property data",
    "{{property.price}}",
    "Save edits",
    "Approve copy",
    "Download",
    "Save export",
    "save_export",
    "blobToDataUrl",
    "exportBlob",
    "inlineExportImages",
    "fallbackImage",
    "Share",
    "navigator.share",
    "Render approved outputs",
    "studio-context-toolbar",
    "studio-zoom-controls",
    "studio-icon-action",
    "studio-export-action",
    "editorVersion: 3",
    "Canvas layers",
    "Delete layer",
    "removeLayer",
    "elementLibraries",
    "elementCategory",
    "Back to element categories",
    "studio-element-library",
    "Opacity",
    "Text size",
    "Export file type",
    "Colour",
    "localStorage",
    "Undo",
    "Redo",
    "studio-layout-document",
    "navigator.clipboard",
    "Change image",
    "studio-hidden-file",
    "studioUploads",
    "estara-marketing-uploads",
    "rememberUpload",
    "useFileImage",
    "dragStudioItem",
    "text/estara",
    "onDrop",
    "Working property",
    "chooseProperty",
    "renderFormat",
    "lineHeight",
    "Line height",
    "studio-tool-panel",
    "studio-property-card",
    "studio-brand-card",
    "studio-media-card",
    "Just Listed",
    "Price Drop",
    "Agent Callout",
    "Open Viewing",
    "style: \"luxury\"",
  ]) assert.match(client, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(css, /text-layout-luxury/);
  assert.match(css, /text-layout-price-drop/);
  assert.match(css, /template-editorial-split/);
  assert.match(css, /template-bold-panel/);
  assert.match(css, /template-rental-spotlight/);
  assert.match(css, /template-commercial-lease/);
  assert.match(css, /template-valuation-offer/);
  assert.match(css, /studio-element-library button span\{color:var\(--studio-brand\)!important\}/);
  assert.match(css, /studio-element-library button\[aria-label\*="Gold"\] span/);
  assert.match(route, /update_copy/);
  assert.match(route, /save_export/);
  assert.match(route, /decodeExportData/);
  assert.match(route, /marketing\.export\.saved/);
  assert.match(route, /cleanDesignDocument/);
  assert.match(route, /photoUrl/);
  assert.match(route, /design/);
  assert.match(route, /headlineScale/);
  assert.match(route, /brandPrimary/);
  assert.match(renderer, /marketing-creative/);
  assert.match(renderer, /creativeSvg/);
  assert.match(css, /studio-inspector/);
  assert.match(css, /studio-inspector\{display:none!important\}/);
  assert.match(css, /studio-editor-shell/);
  assert.match(css, /studio-mobile-toolbar/);
  assert.match(css, /min-width:92px;min-height:44px/);
  assert.match(css, /--studio-overlay/);
  assert.match(css, /studio-layer-list/);
});
