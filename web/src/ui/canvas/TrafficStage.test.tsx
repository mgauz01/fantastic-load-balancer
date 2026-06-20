import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrafficStage from "./TrafficStage";

describe("TrafficStage", () => {
  it("renders an animated canvas inside the stage panel", () => {
    const getContext = vi.fn(() => ({
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      imageSmoothingEnabled: true,
    }));

    HTMLCanvasElement.prototype.getContext = getContext as unknown as typeof HTMLCanvasElement.prototype.getContext;

    const { container } = render(
      <TrafficStage
        latestEntry={null}
        pools={{
          primary: {
            id: "primary",
            name: "Primary",
            stickyEnabled: false,
            backends: [{ id: "a", name: "a", weight: 100, health: "healthy" }],
          },
        }}
      />,
    );

    expect(container.querySelector(".traffic-stage")).not.toBeNull();
    expect(getContext).toHaveBeenCalled();
  });
});
