export interface MetricsSnapshot {
  totalRouted: number;
  successes: number;
  failures: number;
}

export function createMetricsSnapshot(): MetricsSnapshot {
  return { totalRouted: 0, successes: 0, failures: 0 };
}

export function recordRouteOutcome(
  metrics: MetricsSnapshot,
  outcome: number,
): MetricsSnapshot {
  const success = outcome === 200;
  return {
    totalRouted: metrics.totalRouted + 1,
    successes: metrics.successes + (success ? 1 : 0),
    failures: metrics.failures + (success ? 0 : 1),
  };
}

export function cumulativeSuccessRate(metrics: MetricsSnapshot): number {
  if (metrics.totalRouted === 0) {
    return 1;
  }
  return metrics.successes / metrics.totalRouted;
}

export function isEarlyFail(
  requiredRate: number,
  metrics: MetricsSnapshot,
  remainingRequestsEstimate: number,
): boolean {
  const maxPossibleSuccesses = metrics.successes + remainingRequestsEstimate;
  const maxPossibleTotal = metrics.totalRouted + remainingRequestsEstimate;
  if (maxPossibleTotal === 0) {
    return false;
  }
  return maxPossibleSuccesses / maxPossibleTotal < requiredRate;
}

export function rollingFailureRate(
  outcomes: number[],
  windowSize: number,
): number {
  if (outcomes.length === 0) {
    return 0;
  }
  const window = outcomes.slice(-windowSize);
  const failures = window.filter((outcome) => outcome !== 200).length;
  return failures / window.length;
}

export function streakMultiplier(streak: number): number {
  if (streak >= 25) return 3;
  if (streak >= 10) return 2;
  return 1;
}

export function scoreSuccessfulRoute(currentScore: number, streakAfterSuccess: number): number {
  return currentScore + 10 * streakMultiplier(streakAfterSuccess);
}

export function scoreFailedRoute(currentScore: number): number {
  return currentScore - 5;
}
