import { describe, expect, it } from "vitest";
import { isCloudGymProfileId } from "./gymProfileId";

describe("isCloudGymProfileId", () => {
  it("accepts Postgres UUID gym profile ids", () => {
    expect(isCloudGymProfileId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(true);
    expect(isCloudGymProfileId("A1B2C3D4-E5F6-7890-ABCD-EF1234567890")).toBe(true);
  });

  it("rejects local template and optimistic ids that break equipment saves", () => {
    expect(isCloudGymProfileId("your_gym")).toBe(false);
    expect(isCloudGymProfileId("profile_1710000000000")).toBe(false);
    expect(isCloudGymProfileId("")).toBe(false);
    expect(isCloudGymProfileId("not-a-uuid")).toBe(false);
  });
});
