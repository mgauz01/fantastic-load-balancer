import type { MetricsSnapshot } from "../sim/metrics";
import { cumulativeSuccessRate, isEarlyFail } from "../sim/metrics";
import type { CampaignLevel } from "./types";

export type AttemptStatus = "running" | "passed" | "failed_time" | "failed_early";

export interface AttemptState {
  activeTrafficTicks: number;
  metrics: MetricsSnapshot;
  estimatedRemainingRequests: number;
}

export function evaluateAttempt(level: CampaignLevel, state: AttemptState): AttemptStatus {
  const { successRate, durationTicks } = level.passThreshold;
  const rate = cumulativeSuccessRate(state.metrics);

  if (state.activeTrafficTicks >= durationTicks) {
    return rate >= successRate ? "passed" : "failed_time";
  }

  if (isEarlyFail(successRate, state.metrics, state.estimatedRemainingRequests)) {
    return "failed_early";
  }

  return "running";
}

export function canPassWithoutWaiting(level: CampaignLevel, state: AttemptState): boolean {
  const rate = cumulativeSuccessRate(state.metrics);
  return (
    state.activeTrafficTicks < level.passThreshold.durationTicks &&
    rate >= level.passThreshold.successRate
  );
}

export function validateCapstoneMistakes(level: CampaignLevel): string[] {
  if (!level.capstoneMistakes) {
    return [];
  }

  const required: NonNullable<CampaignLevel["capstoneMistakes"]> = [
    "wrong_host_pool",
    "narrow_path_prefix",
    "missing_eu_header",
    "missing_tls_mirror",
    "priority_inversion",
  ];

  const missing = required.filter((mistake) => !level.capstoneMistakes!.includes(mistake));

  const errors: string[] = [];
  if (missing.length > 0) {
    errors.push(`missing capstone mistakes: ${missing.join(", ")}`);
  }
  return errors;
}
