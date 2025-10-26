/**
 * Application mode utilities
 * Distinguishes between demo mode (with fallbacks/simulators) and production mode (strict)
 */

export function isDemoMode(): boolean {
  return (process.env.APP_MODE ?? "demo") === "demo";
}

export function isProdMode(): boolean {
  return !isDemoMode();
}

export function getAppMode(): "demo" | "prod" {
  return isDemoMode() ? "demo" : "prod";
}
