import type { CampaignProgress, LeaderboardEntry, LeaderboardSubmission } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${path}`);
  }

  return (await response.json()) as T;
}

export async function fetchProgress(): Promise<CampaignProgress> {
  return request<CampaignProgress>("/api/progress");
}

export async function saveProgress(progress: CampaignProgress): Promise<CampaignProgress> {
  return request<CampaignProgress>("/api/progress", {
    method: "PUT",
    body: JSON.stringify(progress),
  });
}

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  return request<LeaderboardEntry[]>(`/api/leaderboard?limit=${limit}`);
}

export async function submitLeaderboardScore(
  submission: LeaderboardSubmission,
): Promise<LeaderboardEntry> {
  return request<LeaderboardEntry>("/api/leaderboard", {
    method: "POST",
    body: JSON.stringify(submission),
  });
}
