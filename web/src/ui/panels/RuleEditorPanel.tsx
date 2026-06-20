import { useEffect, useMemo, useState } from "react";
import {
  createPlayerRuleId,
  nextSuggestedPriority,
  validateListenerPlayerRules,
  type RuleDraft,
} from "../../sim/ruleEditor";
import type { BackendPool, ListenerPort, ListenerRules, MatchType, PlayerRule } from "../../sim/types";

interface RuleEditorPanelProps {
  listenerPort: ListenerPort;
  rules: ListenerRules | undefined;
  pools: Record<string, BackendPool>;
  editable: boolean;
  displayHeaders?: string[];
  onListenerChange: (port: ListenerPort) => void;
  onUpsertRule: (draft: RuleDraft) => string | null;
  onDeleteRule: (ruleId: string) => string | null;
}

const EMPTY_DRAFT = (priority: number): RuleDraft => ({
  priority,
  matchType: "host",
  matchValue: "",
  targetPoolId: "",
});

export default function RuleEditorPanel({
  listenerPort,
  rules,
  pools,
  editable,
  displayHeaders = [],
  onListenerChange,
  onUpsertRule,
  onDeleteRule,
}: RuleEditorPanelProps) {
  const poolOptions = useMemo(() => Object.values(pools), [pools]);
  const sortedRules = useMemo(
    () => [...(rules?.playerRules ?? [])].sort((a, b) => a.priority - b.priority),
    [rules?.playerRules],
  );

  const [selectedRuleId, setSelectedRuleId] = useState<string | "new">("new");
  const [draft, setDraft] = useState<RuleDraft>(() => ({
    ...EMPTY_DRAFT(10),
    targetPoolId: poolOptions[0]?.id ?? "",
  }));
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedRuleId === "new") {
      setDraft({
        ...EMPTY_DRAFT(nextSuggestedPriority(sortedRules)),
        targetPoolId: poolOptions[0]?.id ?? "",
      });
      return;
    }

    const selected = sortedRules.find((rule) => rule.id === selectedRuleId);
    if (selected) {
      setDraft(playerRuleToDraft(selected));
    }
  }, [listenerPort, poolOptions, selectedRuleId, sortedRules]);

  const validateDraft = (): string | null => {
    if (!rules) {
      return "Listener not configured";
    }

    const errors = validateListenerPlayerRules(
      rules.playerRules,
      draft,
      pools,
      selectedRuleId === "new" ? undefined : selectedRuleId,
    );
    return errors[0]?.message ?? null;
  };

  const handleSave = () => {
    const validationError = validateDraft();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload: RuleDraft =
      selectedRuleId === "new"
        ? { ...draft, id: createPlayerRuleId() }
        : { ...draft, id: selectedRuleId };

    const error = onUpsertRule(payload);
    setFormError(error);
    if (!error && selectedRuleId === "new") {
      setSelectedRuleId(payload.id ?? "new");
    }
  };

  const handleDelete = () => {
    if (selectedRuleId === "new") {
      return;
    }
    const error = onDeleteRule(selectedRuleId);
    setFormError(error);
    if (!error) {
      setSelectedRuleId("new");
    }
  };

  const handleNewRule = () => {
    setSelectedRuleId("new");
    setFormError(null);
  };

  const updateDraft = <K extends keyof RuleDraft>(field: K, value: RuleDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setFormError(null);
  };

  return (
    <section className="play-panel rule-editor">
      <h2 className="play-panel__title">RULE TABLE</h2>
      <div className="play-panel__body">
        <div className="play-toolbar rule-editor__listener-tabs">
          <button
            type="button"
            aria-pressed={listenerPort === 80}
            onClick={() => onListenerChange(80)}
          >
            :80
          </button>
          <button
            type="button"
            aria-pressed={listenerPort === 443}
            onClick={() => onListenerChange(443)}
          >
            :443
          </button>
        </div>

        {!rules ? (
          <p>No rules for this listener.</p>
        ) : (
          <>
            <ul className="rule-list rule-editor__list">
              {sortedRules.map((rule) => (
                <li key={rule.id}>
                  <button
                    type="button"
                    className={`rule-editor__rule-button${
                      selectedRuleId === rule.id ? " rule-editor__rule-button--active" : ""
                    }`}
                    disabled={!editable}
                    onClick={() => {
                      setSelectedRuleId(rule.id);
                      setFormError(null);
                    }}
                  >
                    P{rule.priority} {formatRuleSummary(rule)}
                  </button>
                </li>
              ))}
              <li className="rule-editor__default-row">
                P{rules.defaultRule.priority} default {rules.defaultRule.action}
                {rules.defaultRule.targetPoolId ? ` → ${rules.defaultRule.targetPoolId}` : ""}
              </li>
            </ul>

            <div className="rule-editor__form">
              <p className="rule-editor__form-title">
                {selectedRuleId === "new" ? "New rule" : "Edit rule"}
              </p>

              <label className="rule-editor__field">
                <span>Priority</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={draft.priority}
                  disabled={!editable}
                  onChange={(event) => updateDraft("priority", Number(event.target.value))}
                />
              </label>

              <label className="rule-editor__field">
                <span>Match type</span>
                <select
                  value={draft.matchType}
                  disabled={!editable}
                  onChange={(event) =>
                    updateDraft("matchType", event.target.value as MatchType)
                  }
                >
                  <option value="host">Host</option>
                  <option value="path_prefix">Path prefix</option>
                  <option value="header">Header</option>
                </select>
              </label>

              {draft.matchType === "header" ? (
                <label className="rule-editor__field">
                  <span>Header name</span>
                  <input
                    type="text"
                    list="rule-header-suggestions"
                    value={draft.headerName ?? ""}
                    disabled={!editable}
                    onChange={(event) => updateDraft("headerName", event.target.value)}
                  />
                  {displayHeaders.length > 0 ? (
                    <datalist id="rule-header-suggestions">
                      {displayHeaders.map((header) => (
                        <option key={header} value={header} />
                      ))}
                    </datalist>
                  ) : null}
                </label>
              ) : null}

              <label className="rule-editor__field">
                <span>Match value</span>
                <input
                  type="text"
                  value={draft.matchValue}
                  disabled={!editable}
                  onChange={(event) => updateDraft("matchValue", event.target.value)}
                />
              </label>

              <label className="rule-editor__field">
                <span>Target pool</span>
                <select
                  value={draft.targetPoolId}
                  disabled={!editable}
                  onChange={(event) => updateDraft("targetPoolId", event.target.value)}
                >
                  {poolOptions.map((pool) => (
                    <option key={pool.id} value={pool.id}>
                      {pool.name}
                    </option>
                  ))}
                </select>
              </label>

              {formError ? <p className="rule-editor__error">{formError}</p> : null}

              <div className="play-toolbar rule-editor__actions">
                <button type="button" disabled={!editable} onClick={handleNewRule}>
                  NEW
                </button>
                <button type="button" disabled={!editable} onClick={handleSave}>
                  SAVE
                </button>
                <button
                  type="button"
                  disabled={!editable || selectedRuleId === "new"}
                  onClick={handleDelete}
                >
                  DELETE
                </button>
              </div>
            </div>
          </>
        )}

        {!editable ? (
          <p className="rule-editor__hint">Pause traffic to add, edit, or delete rules.</p>
        ) : null}
      </div>
    </section>
  );
}

function playerRuleToDraft(rule: PlayerRule): RuleDraft {
  return {
    id: rule.id,
    priority: rule.priority,
    matchType: rule.matchType,
    matchValue: rule.matchValue,
    headerName: rule.headerName,
    targetPoolId: rule.targetPoolId,
  };
}

function formatRuleSummary(rule: PlayerRule): string {
  if (rule.matchType === "header") {
    return `${rule.matchType} ${rule.headerName ?? "?"}=${rule.matchValue} → ${rule.targetPoolId}`;
  }
  return `${rule.matchType} ${rule.matchValue} → ${rule.targetPoolId}`;
}
