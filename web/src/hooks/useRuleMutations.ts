import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  deletePlayerRule,
  upsertPlayerRule,
  validateListenerPlayerRules,
  type RuleDraft,
} from "../sim/ruleEditor";
import type { ListenerPort } from "../sim/types";
import type { SimEngineState } from "../sim/engine";

export function useRuleMutations(
  setState: Dispatch<SetStateAction<SimEngineState>>,
) {
  const upsertRule = useCallback(
    (listenerPort: ListenerPort, draft: RuleDraft): string | null => {
      let message: string | null = null;

      setState((current) => {
        if (current.phase !== "configure") {
          message = "Pause to edit rules";
          return current;
        }

        const listener = current.listenerRules[listenerPort];
        if (!listener) {
          message = "Listener not configured";
          return current;
        }

        const errors = validateListenerPlayerRules(
          listener.playerRules,
          draft,
          current.pools,
          draft.id,
        );
        if (errors.length > 0) {
          message = errors[0]!.message;
          return current;
        }

        try {
          return upsertPlayerRule(current, listenerPort, draft);
        } catch (error) {
          message = error instanceof Error ? error.message : "Failed to save rule";
          return current;
        }
      });

      return message;
    },
    [setState],
  );

  const removeRule = useCallback(
    (listenerPort: ListenerPort, ruleId: string): string | null => {
      let message: string | null = null;

      setState((current) => {
        if (current.phase !== "configure") {
          message = "Pause to edit rules";
          return current;
        }

        try {
          return deletePlayerRule(current, listenerPort, ruleId);
        } catch (error) {
          message = error instanceof Error ? error.message : "Failed to delete rule";
          return current;
        }
      });

      return message;
    },
    [setState],
  );

  return { upsertRule, removeRule };
}
