export const LOW_DATA_IMAGE_REQUEST_BUDGET = 0;
export const LOW_DATA_MIN_IMAGE_REQUEST_REDUCTION = 0.9;
export const LOW_DATA_MEASUREMENT_VIEWPORTS = [
  { name: "low-end-android", width: 360, height: 740, deviceScaleFactor: 2 },
  { name: "small-ios", width: 390, height: 844, deviceScaleFactor: 3 },
  { name: "desktop", width: 1366, height: 768, deviceScaleFactor: 1 },
] as const;

export function lowDataReduction(fullImageRequests: number, lowDataImageRequests: number) {
  if (fullImageRequests <= 0) return 1;
  return (fullImageRequests - lowDataImageRequests) / fullImageRequests;
}

export function passesLowDataBudget(fullImageRequests: number, lowDataImageRequests: number) {
  return lowDataImageRequests <= LOW_DATA_IMAGE_REQUEST_BUDGET &&
    lowDataReduction(fullImageRequests, lowDataImageRequests) >= LOW_DATA_MIN_IMAGE_REQUEST_REDUCTION;
}
