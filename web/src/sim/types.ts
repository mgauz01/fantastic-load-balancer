export type ListenerPort = 80 | 443;

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type MatchType = "host" | "path_prefix" | "header";

export type BackendHealth = "healthy" | "unhealthy";

export type RouteOutcome = 200 | 502 | 503;

export type DefaultRuleAction = "route" | "deny";

export type SimPhase = "configure" | "running";

export interface Backend {
  id: string;
  name: string;
  weight: number;
  health: BackendHealth;
}

export interface BackendPool {
  id: string;
  name: string;
  backends: Backend[];
  stickyEnabled: boolean;
}

export interface PlayerRule {
  id: string;
  priority: number;
  matchType: MatchType;
  matchValue: string;
  headerName?: string;
  targetPoolId: string;
}

export interface DefaultRule {
  priority: number;
  action: DefaultRuleAction;
  targetPoolId?: string;
}

export interface ListenerRules {
  listenerPort: ListenerPort;
  playerRules: PlayerRule[];
  defaultRule: DefaultRule;
}

export interface IncomingRequest {
  id: string;
  listenerPort: ListenerPort;
  host: string;
  path: string;
  method: HttpMethod;
  headers: Record<string, string>;
  sessionCookie?: string;
}

export interface RouteResult {
  outcome: RouteOutcome;
  listenerPort: ListenerPort;
  matchedPoolId: string | null;
  matchedBackendId: string | null;
  matchedRuleId: string | null;
  tlsTerminated: boolean;
  denied: boolean;
}

export interface RequestLogEntry {
  id: string;
  outcome: RouteOutcome;
  listenerPort: ListenerPort;
  method: HttpMethod;
  host: string;
  path: string;
  poolId: string | null;
  poolName: string | null;
  backendId: string | null;
  backendName: string | null;
  tlsTerminated: boolean;
  sessionCookie?: string;
  headerSuffix?: string;
}

export interface PoolRotationState {
  [poolId: string]: number;
}

export interface RouteContext {
  pools: Record<string, BackendPool>;
  listenerRules: ListenerRules;
  rotationState: PoolRotationState;
  stickyBindings: StickyBindings;
  rng: () => number;
}

export interface StickyBindings {
  [sessionKey: string]: {
    poolId: string;
    backendId: string;
  };
}

export interface RuleValidationError {
  code: "duplicate_priority" | "too_many_rules" | "invalid_player_deny";
  message: string;
}
