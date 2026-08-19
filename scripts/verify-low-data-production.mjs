import { readFileSync } from "node:fs";
import {
  LOW_DATA_MEASUREMENT_VIEWPORTS,
  LOW_DATA_MIN_IMAGE_REQUEST_REDUCTION,
  lowDataReduction,
  passesLowDataBudget,
} from "../db/low-data-budget.ts";

const evidencePath = process.argv[2];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

if (!evidencePath || evidencePath === "--help") {
  console.log("Usage: npm run low-data:verify -- path/to/hosted-low-data-evidence.json");
  console.log("The evidence must contain production URL, commit SHA, capture time and one measurement per required viewport.");
  process.exit(evidencePath === "--help" ? 0 : 1);
}

let evidence;
try {
  evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
} catch (error) {
  fail(`Could not read low-data evidence JSON: ${error instanceof Error ? error.message : String(error)}`);
}

if (!process.exitCode) {
  const errors = [];
  const requiredViewports = new Set(LOW_DATA_MEASUREMENT_VIEWPORTS.map((viewport) => viewport.name));
  const measurements = Array.isArray(evidence.measurements) ? evidence.measurements : [];

  try {
    const url = new URL(evidence.productionUrl);
    if (!["https:", "http:"].includes(url.protocol)) errors.push("productionUrl must be an HTTP(S) URL.");
  } catch {
    errors.push("productionUrl must be a valid URL.");
  }

  if (!/^[0-9a-f]{7,40}$/i.test(String(evidence.commitSha || ""))) {
    errors.push("commitSha must be the deployed Git commit SHA.");
  }

  if (Number.isNaN(Date.parse(String(evidence.capturedAt || "")))) {
    errors.push("capturedAt must be an ISO-8601 timestamp.");
  }

  for (const viewport of requiredViewports) {
    const measurement = measurements.find((row) => row?.viewport === viewport);
    if (!measurement) {
      errors.push(`Missing measurement for ${viewport}.`);
      continue;
    }

    const full = measurement.fullMode || {};
    const low = measurement.lowDataMode || {};
    for (const [label, value] of [
      ["fullMode.imageRequests", full.imageRequests],
      ["fullMode.transferBytes", full.transferBytes],
      ["lowDataMode.imageRequests", low.imageRequests],
      ["lowDataMode.transferBytes", low.transferBytes],
    ]) {
      if (!isPositiveNumber(value)) errors.push(`${measurement.viewport} ${label} must be a non-negative number.`);
    }

    if (errors.length) continue;

    const imageReduction = lowDataReduction(full.imageRequests, low.imageRequests);
    const byteReduction = lowDataReduction(full.transferBytes, low.transferBytes);
    const pass = passesLowDataBudget(full.imageRequests, low.imageRequests) &&
      byteReduction >= LOW_DATA_MIN_IMAGE_REQUEST_REDUCTION;

    console.log(`${measurement.viewport}: image reduction ${(imageReduction * 100).toFixed(1)}%, byte reduction ${(byteReduction * 100).toFixed(1)}%`);
    if (!pass) {
      errors.push(`${measurement.viewport} does not meet the ${LOW_DATA_MIN_IMAGE_REQUEST_REDUCTION * 100}% reduction budget with zero low-data image requests.`);
    }
  }

  if (errors.length) {
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log("Low-data production evidence passed.");
  }
}
