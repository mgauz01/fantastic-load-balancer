import { useCallback, useEffect, useState } from "react";
import { fetchProgress, saveProgress } from "../api/client";
import type { CampaignProgress } from "../api/types";

const DEFAULT_PROGRESS: CampaignProgress = {
  highestUnlocked: 1,
  completedLevels: [],
  passBadges: [],
};

export function isArcadeUnlocked(progress: CampaignProgress): boolean {
  return progress.highestUnlocked >= 3;
}

export function isLevelUnlocked(levelIndex: number, progress: CampaignProgress): boolean {
  return levelIndex <= progress.highestUnlocked;
}

export function hasPassBadge(levelId: string, progress: CampaignProgress): boolean {
  return progress.passBadges.includes(levelId);
}

export function useProgress() {
  const [progress, setProgress] = useState<CampaignProgress>(DEFAULT_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchProgress();
      setProgress(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load progress");
      setProgress(DEFAULT_PROGRESS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const completeLevel = useCallback(async (levelId: string) => {
    const completedLevels = progress.completedLevels.includes(levelId)
      ? progress.completedLevels
      : [...progress.completedLevels, levelId];
    const passBadges = progress.passBadges.includes(levelId)
      ? progress.passBadges
      : [...progress.passBadges, levelId];

    const levelIndex = Number(levelId.replace("level_", ""));
    const highestUnlocked = Math.max(
      progress.highestUnlocked,
      Number.isFinite(levelIndex) ? Math.min(levelIndex + 1, 8) : 1,
    );

    const next: CampaignProgress = {
      highestUnlocked,
      completedLevels,
      passBadges,
    };

    try {
      const saved = await saveProgress(next);
      setProgress(saved);
      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save progress");
      setProgress(next);
      return next;
    }
  }, [progress]);

  return {
    progress,
    loading,
    error,
    reload,
    completeLevel,
    arcadeUnlocked: isArcadeUnlocked(progress),
  };
}
