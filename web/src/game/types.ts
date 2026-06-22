import type { DefaultRule, HttpMethod, ListenerPort, PlayerRule } from "../sim/types";

export interface LevelBackend {
  id: string;
  name: string;
  weight: number;
}

export interface LevelPool {
  id: string;
  name: string;
  stickyEnabled: boolean;
  backends: LevelBackend[];
}

export interface ListenerConfig {
  defaultRule: DefaultRule;
  starterRules: PlayerRule[];
}

export interface PassThreshold {
  successRate: number;
  durationTicks: number;
}

export interface TrafficTemplate {
  host: string;
  path: string;
  method: HttpMethod;
  listenerPort: ListenerPort;
  headers?: Record<string, string>;
  sessionCookie?: string;
}

export interface TrafficSpawn {
  everyTicks: number;
  count: number;
  template: TrafficTemplate;
}

export interface HealthEvent {
  tick: number;
  backendId: string;
  health: "healthy" | "unhealthy";
}

export type CapstoneMistake =
  | "wrong_host_pool"
  | "narrow_path_prefix"
  | "missing_eu_header"
  | "missing_tls_mirror"
  | "priority_inversion";

export interface RuleCoach {
  priority?: number;
  matchType: PlayerRule["matchType"];
  matchValue: string;
  headerName?: string;
  targetPoolId: string;
}

export interface CampaignLevel {
  id: string;
  index: number;
  title: string;
  briefMarkdown: string;
  playHint?: string;
  ruleCoach?: RuleCoach;
  pools: LevelPool[];
  listeners: Partial<Record<ListenerPort, ListenerConfig>>;
  autoRecovery: boolean;
  recoveryTicks: number;
  displayHeaders: string[];
  passThreshold: PassThreshold;
  trafficSpawns: TrafficSpawn[];
  healthEvents: HealthEvent[];
  capstoneMistakes?: CapstoneMistake[];
}
