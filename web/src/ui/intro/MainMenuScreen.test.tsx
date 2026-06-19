import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import MainMenuScreen from "./MainMenuScreen";

describe("MainMenuScreen", () => {
  it("renders four menu slots with Campaign focusable", () => {
    render(<MainMenuScreen />);

    const menu = document.getElementById("main-menu");
    expect(menu).toBeTruthy();

    expect(screen.getByRole("heading", { name: /fantastic load balancer/i })).toBeInTheDocument();
    expect(within(menu!).getByRole("button", { name: /campaign/i })).toBeInTheDocument();
    expect(within(menu!).getByRole("button", { name: /endless arcade/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.queryByText(/pool health/i)).not.toBeInTheDocument();
  });

  it("moves focus with ArrowDown skipping locked arcade", async () => {
    const user = userEvent.setup();
    render(<MainMenuScreen />);

    const menu = document.getElementById("main-menu")!;
    const campaign = within(menu).getByRole("button", { name: /campaign/i });
    campaign.focus();
    expect(campaign).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(within(menu).getByRole("button", { name: /leaderboard/i })).toHaveFocus();
  });
});
