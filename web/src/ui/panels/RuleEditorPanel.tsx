import type { ListenerPort, ListenerRules } from "../../sim/types";

interface RuleEditorPanelProps {
  listenerPort: ListenerPort;
  rules: ListenerRules | undefined;
  onListenerChange: (port: ListenerPort) => void;
}

export default function RuleEditorPanel({
  listenerPort,
  rules,
  onListenerChange,
}: RuleEditorPanelProps) {
  return (
    <section className="play-panel">
      <h2 className="play-panel__title">RULE TABLE</h2>
      <div className="play-panel__body">
        <div className="play-toolbar" style={{ marginTop: 0, marginBottom: 8 }}>
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
          <ul className="rule-list">
            {rules.playerRules.map((rule) => (
              <li key={rule.id}>
                P{rule.priority} {rule.matchType} {rule.matchValue} → {rule.targetPoolId}
              </li>
            ))}
            <li>
              P{rules.defaultRule.priority} default {rules.defaultRule.action}
              {rules.defaultRule.targetPoolId ? ` → ${rules.defaultRule.targetPoolId}` : ""}
            </li>
          </ul>
        )}
        <p style={{ marginTop: 12, fontSize: 18, color: "var(--color-muted)" }}>
          Pause to edit rules in a later milestone.
        </p>
      </div>
    </section>
  );
}
