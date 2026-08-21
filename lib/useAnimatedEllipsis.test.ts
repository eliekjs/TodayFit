import { describe, expect, it } from "vitest";
import { applyBusyEllipsis } from "./useAnimatedEllipsis";

describe("applyBusyEllipsis", () => {
  it("replaces a unicode ellipsis with animated dots", () => {
    expect(applyBusyEllipsis("Saving…", ".")).toBe("Saving.");
    expect(applyBusyEllipsis("Saving…", "..")).toBe("Saving..");
    expect(applyBusyEllipsis("Saving…", "...")).toBe("Saving...");
  });

  it("replaces ascii dots", () => {
    expect(applyBusyEllipsis("Generating...", ".")).toBe("Generating.");
  });

  it("appends when there is no trailing ellipsis", () => {
    expect(applyBusyEllipsis("Working", "...")).toBe("Working...");
  });
});
