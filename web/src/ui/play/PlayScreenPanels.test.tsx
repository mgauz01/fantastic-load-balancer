import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PlayScreenPanels from "./PlayScreenPanels";

describe("PlayScreenPanels", () => {
  it("shows tab controls and switches visible panel on mobile layout", async () => {
    const user = userEvent.setup();

    render(
      <PlayScreenPanels
        log={<div>Log panel</div>}
        stage={<div>Stage panel</div>}
        rules={<div>Rules panel</div>}
        health={<div>Health panel</div>}
      />,
    );

    expect(screen.getByRole("tab", { name: "LOG" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "STAGE" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Stage panel")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "RULES" }));

    expect(screen.getByRole("tab", { name: "RULES" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Rules panel")).toBeInTheDocument();
  });
});
