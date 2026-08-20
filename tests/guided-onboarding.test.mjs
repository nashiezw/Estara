import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("new agencies enter a guided launch flow that leads to the first property", async () => {
  const [app, css, pickerCss, pickerBridge] = await Promise.all([
    read("../app/estara-app.tsx"),
    read("../app/globals.css"),
    read("../app/template-picker.css"),
    read("../template-picker.css"),
  ]);

  assert.match(app, /GuidedOnboarding/);
  assert.match(app, /Agency identity/);
  assert.match(app, /Brand colours/);
  assert.match(app, /Website style/);
  assert.match(app, /Public address/);
  assert.match(app, /Launch workspace and add first property/);
  assert.match(app, /setCapture\(true\);setView\("properties"\)/);
  assert.match(app, /first-property-empty/);
  assert.match(app, /first-property-page/);
  assert.match(app, /Add the first property to bring this agency online/);
  assert.match(css, /GUIDED OWNER ONBOARDING/);
  assert.match(css, /\.guided-rail/);
  assert.match(css, /\.guided-template-grid/);
  assert.match(css, /template-picker\.css/);
  assert.match(pickerBridge, /\.\/app\/template-picker\.css/);
  assert.match(pickerCss, /VISUAL WEBSITE TEMPLATE PICKER/);
  assert.match(pickerCss, /\.template-preview-classic/);
  assert.match(pickerCss, /\.template-preview-modern/);
  assert.match(pickerCss, /\.template-preview-editorial/);
  assert.match(pickerCss, /\.template-preview-skyline/);
  assert.match(pickerCss, /\.template-preview-boutique/);
  assert.match(pickerCss, /\.template-preview-estate/);
  assert.match(pickerCss, /\.template-preview-coastal/);
  assert.match(pickerCss, /\.template-preview-portfolio/);
  assert.match(css, /\.guided-launch-list/);
  assert.match(css, /\.first-property-page/);
});

test("onboarding persists full agency brand choices from first setup", async () => {
  const route = await read("../app/api/onboarding/route.ts");

  assert.match(route, /tagline/);
  assert.match(route, /primaryColor/);
  assert.match(route, /accentColor/);
  assert.match(route, /whatsapp/);
  assert.match(route, /email/);
  assert.match(route, /responseSlaMinutes/);
  assert.match(route, /isWebsiteTemplateKey\(template\)/);
  assert.match(route, /id<>\?/);
  assert.match(route, /agency\.settings\.manage/);
  assert.match(route, /primary_color=\?/);
  assert.match(route, /accent_color=\?/);
  assert.match(route, /typography=\?/);
  assert.match(route, /invalidatePublicSite\(w\.agencyId\)/);
});
