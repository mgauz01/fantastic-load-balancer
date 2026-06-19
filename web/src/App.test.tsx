import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the light theme shell with decorative traffic backdrop", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /fantastic load balancer/i }),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-theme="menu-light"]')).toBeInTheDocument();
    expect(document.querySelector(".intro-traffic-backdrop")).toBeInTheDocument();
  });
});
