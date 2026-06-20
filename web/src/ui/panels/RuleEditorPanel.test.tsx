import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ListenerRules } from "../../sim/types";
import RuleEditorPanel from "./RuleEditorPanel";

const pools = {
  web: {
    id: "web",
    name: "Web Pool",
    stickyEnabled: false,
    backends: [{ id: "web-a", name: "web-a", weight: 100, health: "healthy" as const }],
  },
  api: {
    id: "api",
    name: "API Pool",
    stickyEnabled: false,
    backends: [{ id: "api-a", name: "api-a", weight: 100, health: "healthy" as const }],
  },
};

const rules: ListenerRules = {
  listenerPort: 80,
  playerRules: [],
  defaultRule: { priority: 100, action: "deny" },
};

describe("RuleEditorPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows pause hint when not editable", () => {
    render(
      <RuleEditorPanel
        listenerPort={80}
        rules={rules}
        pools={pools}
        editable={false}
        onListenerChange={() => {}}
        onUpsertRule={() => null}
        onDeleteRule={() => null}
      />,
    );

    expect(screen.getByText(/pause traffic to add/i)).toBeInTheDocument();
  });

  it("calls onUpsertRule when saving a new rule", async () => {
    const user = userEvent.setup();
    const onUpsertRule = vi.fn(() => null);

    render(
      <RuleEditorPanel
        listenerPort={80}
        rules={rules}
        pools={pools}
        editable
        onListenerChange={() => {}}
        onUpsertRule={onUpsertRule}
        onDeleteRule={() => null}
      />,
    );

    await user.clear(screen.getByLabelText(/match value/i));
    await user.type(screen.getByLabelText(/match value/i), "app.example");
    await user.selectOptions(screen.getByLabelText(/target pool/i), "api");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(onUpsertRule).toHaveBeenCalledWith(
      expect.objectContaining({
        matchType: "host",
        matchValue: "app.example",
        targetPoolId: "api",
      }),
    );
  });
});
