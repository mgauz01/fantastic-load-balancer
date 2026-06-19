import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

function getMainMenu() {
  const menu = document.getElementById("main-menu");
  expect(menu).toBeTruthy();
  return menu!;
}

describe("App", () => {
  it("renders the light intro menu without HeartBar", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /fantastic load balancer/i }),
    ).toBeInTheDocument();
    expect(within(getMainMenu()).getByRole("button", { name: /campaign/i })).toBeInTheDocument();
    expect(document.querySelector(".intro-traffic-backdrop")).toBeInTheDocument();
    expect(document.querySelector('[data-theme="menu-light"]')).toBeInTheDocument();
  });

  it("navigates to campaign when Campaign is selected", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(getMainMenu()).getByRole("button", { name: /campaign/i }));

    expect(screen.getByRole("heading", { name: /^campaign$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to main menu/i })).toBeInTheDocument();
  });

  it("opens help overlay from Help slot", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(getMainMenu()).getByRole("button", { name: /^help$/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^help$/i, level: 2 })).toBeInTheDocument();
  });

  it("shows play icons on menu slots", () => {
    render(<App />);

    expect(document.querySelectorAll(".menu-play-icon").length).toBeGreaterThan(0);
    expect(document.querySelector(".menu-chevron")).not.toBeInTheDocument();
  });
});
