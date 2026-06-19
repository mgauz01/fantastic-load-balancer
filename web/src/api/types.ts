export interface CampaignProgress {
  highestUnlocked: number;
  completedLevels: string[];
  passBadges: string[];
}

export interface LeaderboardEntry {
  id: number;
  initials: string;
  score: number;
  activeTrafficMs: number;
  createdAt: string;
}

export interface LeaderboardSubmission {
  initials: string;
  score: number;
  activeTrafficMs: number;
}
