# Low-Data Production Measurement

The public launch gate for low-data mode requires evidence from the hosted production deployment, not only local build tests.

## Capture Scope

Measure the deployed commit in both normal imagery mode and low-data mode across every viewport in `LOW_DATA_MEASUREMENT_VIEWPORTS`:

- `low-end-android` at `360x740`
- `small-ios` at `390x844`
- `desktop` at `1366x768`

For each viewport, capture image request count and transferred bytes from the browser network panel after the landing-to-workspace path has settled.

## Evidence File

Save the captured evidence as JSON with this shape:

```json
{
  "productionUrl": "https://example.estara.co.zw",
  "commitSha": "0123456789abcdef",
  "capturedAt": "2026-08-19T00:00:00.000Z",
  "measurements": [
    {
      "viewport": "low-end-android",
      "fullMode": { "imageRequests": 10, "transferBytes": 500000 },
      "lowDataMode": { "imageRequests": 0, "transferBytes": 20000 }
    }
  ]
}
```

Run:

```bash
npm run low-data:verify -- docs/evidence/low-data-production.json
```

The verifier fails unless every required viewport is present, low-data mode makes zero image requests and both image-request and byte reduction meet the 90% launch budget.
