import type { IncomingRequest, PlayerRule } from "./types";

export function ruleMatchesRequest(rule: PlayerRule, request: IncomingRequest): boolean {
  switch (rule.matchType) {
    case "host":
      return request.host === rule.matchValue;
    case "path_prefix":
      return request.path.startsWith(rule.matchValue);
    case "header": {
      if (!rule.headerName) return false;
      const headerValue = getHeaderValue(request.headers, rule.headerName);
      return headerValue === rule.matchValue;
    }
    default: {
      const _exhaustive: never = rule.matchType;
      return _exhaustive;
    }
  }
}

export function findMatchingPlayerRule(
  rules: PlayerRule[],
  request: IncomingRequest,
): PlayerRule | null {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    if (ruleMatchesRequest(rule, request)) {
      return rule;
    }
  }
  return null;
}

function getHeaderValue(headers: Record<string, string>, name: string): string | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return undefined;
}
