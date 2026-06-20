import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PlayHelpOverlay from "./PlayHelpOverlay";

describe("PlayHelpOverlay", () => {
  it("renders play help copy and closes from the close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<PlayHelpOverlay onClose={onClose} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Press PAUSE or \? during a run/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "CLOSE" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
