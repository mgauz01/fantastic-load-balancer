import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CampaignMapScreen from "./CampaignMapScreen";

const defaultProgress = {
  highestUnlocked: 1,
  completedLevels: [],
  passBadges: [],
};

describe("CampaignMapScreen", () => {
  afterEach(() => {
    cleanup();
  });
  it("lists levels with the first unlocked", () => {
    render(
      <CampaignMapScreen
        progress={defaultProgress}
        onBack={() => {}}
        onSelectLevel={() => {}}
      />,
    );

    expect(screen.getByRole("heading", { name: /^campaign$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /01 rotation basics/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /02/i })).toBeDisabled();
  });

  it("calls onSelectLevel for unlocked rows", async () => {
    const user = userEvent.setup();
    const onSelectLevel = vi.fn();

    render(
      <CampaignMapScreen
        progress={defaultProgress}
        onBack={() => {}}
        onSelectLevel={onSelectLevel}
      />,
    );

    await user.click(screen.getByRole("button", { name: /01 rotation basics/i }));
    expect(onSelectLevel).toHaveBeenCalledWith("level_01");
  });
});
