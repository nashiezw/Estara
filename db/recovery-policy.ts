export const RECOVERY_TARGETS = {
  mvpRpoHours: 24,
  mvpRtoHours: 4,
  d1TimeTravelRetentionDays: {
    freePlan: 7,
    paidPlan: 30,
  },
} as const;

export const D1_POINT_IN_TIME_RECOVERY = {
  provider: "Cloudflare D1 Time Travel",
  supportedBackendVersion: "production",
  restoreCommand: "wrangler d1 time-travel restore",
  infoCommand: "wrangler d1 time-travel info",
  destructiveInPlaceRestore: true,
  rehearsalRequiredBeforeLaunch: true,
  undoRequiresPreviousBookmark: true,
} as const;

export function d1PointInTimeRecoverySupported(version: string | undefined) {
  return version === D1_POINT_IN_TIME_RECOVERY.supportedBackendVersion;
}
