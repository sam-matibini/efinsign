import { afterEach, describe, expect, it, vi } from "vitest";
import { closeSigningWindow } from "./closeSigningWindow";

describe("closeSigningWindow", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns to the dashboard when the tab cannot close", () => {
    vi.useFakeTimers();
    const replace = vi.fn();
    vi.stubGlobal("window", {
      ...window,
      opener: null,
      closed: false,
      close: vi.fn(),
      setTimeout: window.setTimeout.bind(window),
      location: { ...window.location, replace },
    });
    closeSigningWindow();
    vi.runAllTimers();
    expect(replace).toHaveBeenCalledWith("/");
  });
});
