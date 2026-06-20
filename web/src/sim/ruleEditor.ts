import { assertValidPlayerRules, validatePlayerRules } from "./rules";
import type { BackendPool, ListenerPort, PlayerRule, SimPhase } from "./types";
import type { SimEngineState } from "./engine";

export interface RuleDraft {
  id?: string;
  priority: number;
  matchType: PlayerRule["matchType"];
  matchValue: string;
  headerName?: string;
  targetPoolId: string;
}

export interface RuleFieldError {
  field: keyof RuleDraft | "general";
  message: string;
}

let ruleIdCounter = 0;

export function createPlayerRuleId(): string {
  ruleIdCounter += 1;
  return `player-rule-${ruleIdCounter}`;
}

export function resetPlayerRuleIdCounter(): void {
  ruleIdCounter = 0;
}

export function validateRuleDraft(
  draft: RuleDraft,
  pools: Record<string, BackendPool>,
): RuleFieldError[] {
  const errors: RuleFieldError[] = [];

  if (!Number.isInteger(draft.priority) || draft.priority < 1 || draft.priority > 99) {
    errors.push({
      field: "priority",
      message: "Priority must be an integer from 1 to 99",
    });
  }

  if (!draft.matchValue.trim()) {
    errors.push({ field: "matchValue", message: "Match value is required" });
  }

  if (draft.matchType === "header" && !draft.headerName?.trim()) {
    errors.push({ field: "headerName", message: "Header name is required for header rules" });
  }

  if (!draft.targetPoolId || !pools[draft.targetPoolId]) {
    errors.push({ field: "targetPoolId", message: "Select a valid target pool" });
  }

  return errors;
}

export function draftToPlayerRule(draft: RuleDraft): PlayerRule {
  const rule: PlayerRule = {
    id: draft.id ?? createPlayerRuleId(),
    priority: draft.priority,
    matchType: draft.matchType,
    matchValue: draft.matchValue.trim(),
    targetPoolId: draft.targetPoolId,
  };

  if (draft.matchType === "header") {
    rule.headerName = draft.headerName?.trim();
  }

  return rule;
}

export function validateListenerPlayerRules(
  rules: PlayerRule[],
  draft: RuleDraft,
  pools: Record<string, BackendPool>,
  editingRuleId?: string,
): RuleFieldError[] {
  const fieldErrors = validateRuleDraft(draft, pools);
  if (fieldErrors.length > 0) {
    return fieldErrors;
  }

  const candidate = draftToPlayerRule({ ...draft, id: editingRuleId ?? draft.id });
  const nextRules = editingRuleId
    ? rules.map((rule) => (rule.id === editingRuleId ? candidate : rule))
    : [...rules, candidate];

  return validatePlayerRules(nextRules).map((error) => ({
    field: "general" as const,
    message: error.message,
  }));
}

export function nextSuggestedPriority(rules: PlayerRule[]): number {
  if (rules.length === 0) {
    return 10;
  }
  const maxPriority = Math.max(...rules.map((rule) => rule.priority));
  return Math.min(99, maxPriority + 1);
}

export function canEditRules(phase: SimPhase): boolean {
  return phase === "configure";
}

export function setListenerPlayerRules(
  state: SimEngineState,
  listenerPort: ListenerPort,
  playerRules: PlayerRule[],
): SimEngineState {
  if (!canEditRules(state.phase)) {
    throw new Error("Rules can only be edited while paused");
  }

  assertValidPlayerRules(playerRules);

  const current = state.listenerRules[listenerPort];
  if (!current) {
    throw new Error(`No listener configured for port ${listenerPort}`);
  }

  const sorted = [...playerRules].sort((a, b) => a.priority - b.priority);

  return {
    ...state,
    listenerRules: {
      ...state.listenerRules,
      [listenerPort]: {
        ...current,
        playerRules: sorted,
      },
    },
  };
}

export function upsertPlayerRule(
  state: SimEngineState,
  listenerPort: ListenerPort,
  draft: RuleDraft,
): SimEngineState {
  const current = state.listenerRules[listenerPort];
  if (!current) {
    throw new Error(`No listener configured for port ${listenerPort}`);
  }

  const rule = draftToPlayerRule(draft);
  const errors = validateListenerPlayerRules(
    current.playerRules,
    draft,
    state.pools,
    draft.id,
  );
  if (errors.length > 0) {
    throw new Error(errors[0]!.message);
  }

  const exists = current.playerRules.some((entry) => entry.id === rule.id);
  const playerRules = exists
    ? current.playerRules.map((entry) => (entry.id === rule.id ? rule : entry))
    : [...current.playerRules, rule];

  return setListenerPlayerRules(state, listenerPort, playerRules);
}

export function deletePlayerRule(
  state: SimEngineState,
  listenerPort: ListenerPort,
  ruleId: string,
): SimEngineState {
  const current = state.listenerRules[listenerPort];
  if (!current) {
    throw new Error(`No listener configured for port ${listenerPort}`);
  }

  const playerRules = current.playerRules.filter((rule) => rule.id !== ruleId);
  return setListenerPlayerRules(state, listenerPort, playerRules);
}
