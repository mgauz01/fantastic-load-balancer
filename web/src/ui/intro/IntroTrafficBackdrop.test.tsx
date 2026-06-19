import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import IntroTrafficBackdrop from "./IntroTrafficBackdrop";

describe("IntroTrafficBackdrop", () => {
  it("renders a hidden decorative canvas", () => {
    const { container } = render(<IntroTrafficBackdrop />);
    const canvas = container.querySelector("canvas.intro-traffic-backdrop");
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
  });
});
