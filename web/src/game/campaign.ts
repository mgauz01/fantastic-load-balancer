import type { CampaignLevel } from "./types";
import level01 from "../../../content/levels/level_01.json";
import level02 from "../../../content/levels/level_02.json";
import level03 from "../../../content/levels/level_03.json";
import level04 from "../../../content/levels/level_04.json";
import level05 from "../../../content/levels/level_05.json";
import level06 from "../../../content/levels/level_06.json";
import level07 from "../../../content/levels/level_07.json";
import level08 from "../../../content/levels/level_08.json";

const LEVELS: CampaignLevel[] = [
  level01 as CampaignLevel,
  level02 as CampaignLevel,
  level03 as CampaignLevel,
  level04 as CampaignLevel,
  level05 as CampaignLevel,
  level06 as CampaignLevel,
  level07 as CampaignLevel,
  level08 as CampaignLevel,
];

const byID = new Map(LEVELS.map((level) => [level.id, level]));

export function listCampaignLevels(): CampaignLevel[] {
  return [...LEVELS];
}

export function getCampaignLevel(id: string): CampaignLevel | null {
  return byID.get(id) ?? null;
}

export function levelIDForIndex(index: number): string {
  return `level_${String(index).padStart(2, "0")}`;
}

export function poolsToSimRecord(level: CampaignLevel) {
  return Object.fromEntries(
    level.pools.map((pool) => [
      pool.id,
      {
        id: pool.id,
        name: pool.name,
        stickyEnabled: pool.stickyEnabled,
        backends: pool.backends.map((backend) => ({
          ...backend,
          health: "healthy" as const,
        })),
      },
    ]),
  );
}
