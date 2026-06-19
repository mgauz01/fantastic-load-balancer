import { findMatchingPlayerRule } from "./match";
import { selectBackendFromPool } from "./sticky";
import type {
  IncomingRequest,
  ListenerRules,
  RequestLogEntry,
  RouteContext,
  RouteResult,
} from "./types";

export function routeRequest(request: IncomingRequest, context: RouteContext): RouteResult {
  const { listenerRules, pools } = context;
  const tlsTerminated = request.listenerPort === 443;
  const matchedPlayerRule = findMatchingPlayerRule(listenerRules.playerRules, request);

  if (matchedPlayerRule) {
    return routeToPool(request, context, matchedPlayerRule.targetPoolId, matchedPlayerRule.id, tlsTerminated);
  }

  const defaultRule = listenerRules.defaultRule;
  if (defaultRule.action === "deny") {
    return {
      outcome: 503,
      listenerPort: request.listenerPort,
      matchedPoolId: null,
      matchedBackendId: null,
      matchedRuleId: "default",
      tlsTerminated,
      denied: true,
    };
  }

  if (!defaultRule.targetPoolId) {
    return {
      outcome: 503,
      listenerPort: request.listenerPort,
      matchedPoolId: null,
      matchedBackendId: null,
      matchedRuleId: "default",
      tlsTerminated,
      denied: true,
    };
  }

  return routeToPool(
    request,
    context,
    defaultRule.targetPoolId,
    "default",
    tlsTerminated,
  );
}

function routeToPool(
  request: IncomingRequest,
  context: RouteContext,
  poolId: string,
  matchedRuleId: string,
  tlsTerminated: boolean,
): RouteResult {
  const pool = context.pools[poolId];
  if (!pool) {
    return {
      outcome: 503,
      listenerPort: request.listenerPort,
      matchedPoolId: null,
      matchedBackendId: null,
      matchedRuleId,
      tlsTerminated,
      denied: true,
    };
  }

  const backend = selectBackendFromPool(
    pool,
    context.rotationState,
    context.stickyBindings,
    request.sessionCookie,
    context.rng,
  );

  if (!backend) {
    return {
      outcome: 502,
      listenerPort: request.listenerPort,
      matchedPoolId: pool.id,
      matchedBackendId: null,
      matchedRuleId,
      tlsTerminated,
      denied: false,
    };
  }

  return {
    outcome: 200,
    listenerPort: request.listenerPort,
    matchedPoolId: pool.id,
    matchedBackendId: backend.id,
    matchedRuleId,
    tlsTerminated,
    denied: false,
  };
}

export function toLogEntry(
  request: IncomingRequest,
  result: RouteResult,
  pools: RouteContext["pools"],
): RequestLogEntry {
  const pool = result.matchedPoolId ? pools[result.matchedPoolId] : null;
  const backend =
    pool && result.matchedBackendId
      ? pool.backends.find((item) => item.id === result.matchedBackendId) ?? null
      : null;

  return {
    id: request.id,
    outcome: result.outcome,
    listenerPort: request.listenerPort,
    method: request.method,
    host: request.host,
    path: request.path,
    poolId: pool?.id ?? null,
    poolName: pool?.name ?? null,
    backendId: backend?.id ?? null,
    backendName: backend?.name ?? null,
    tlsTerminated: result.tlsTerminated,
    sessionCookie: request.sessionCookie,
  };
}
