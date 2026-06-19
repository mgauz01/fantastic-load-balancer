import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the U1 light theme shell", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /fantastic load balancer/i }),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-theme="menu-light"]')).toBeInTheDocument();
  });
});
