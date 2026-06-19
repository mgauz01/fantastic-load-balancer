import type { PlayerRule, RuleValidationError } from "./types";

export const MAX_PLAYER_RULES = 10;

export function validatePlayerRules(rules: PlayerRule[]): RuleValidationError[] {
  const errors: RuleValidationError[] = [];

  if (rules.length > MAX_PLAYER_RULES) {
    errors.push({
      code: "too_many_rules",
      message: `At most ${MAX_PLAYER_RULES} player rules are allowed per listener`,
    });
  }

  const seen = new Set<number>();
  for (const rule of rules) {
    if (seen.has(rule.priority)) {
      errors.push({
        code: "duplicate_priority",
        message: `Duplicate rule priority ${rule.priority} on listener rule table`,
      });
    }
    seen.add(rule.priority);
  }

  return errors;
}

export function assertValidPlayerRules(rules: PlayerRule[]): void {
  const errors = validatePlayerRules(rules);
  if (errors.length > 0) {
    throw new Error(errors[0]!.message);
  }
}
