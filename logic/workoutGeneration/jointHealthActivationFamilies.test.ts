import { describe, expect, it } from "vitest";
import {
  getJointHealthActivationFamilyId,
  jointHealthActivationFamilyAlreadyUsed,
} from "./jointHealthActivationFamilies";

describe("jointHealthActivationFamilies", () => {
  it("groups wall slide catalog variants into one family", () => {
    expect(getJointHealthActivationFamilyId("wall_slide", "shoulder_health")).toBe("wall_slide_scap");
    expect(getJointHealthActivationFamilyId("wall_slides_with_lift_off", "shoulder_health")).toBe(
      "wall_slide_scap"
    );
    expect(getJointHealthActivationFamilyId("scapular_slides", "shoulder_health")).toBe("wall_slide_scap");
  });

  it("groups distinct shoulder prep patterns separately", () => {
    expect(getJointHealthActivationFamilyId("band_pullapart", "shoulder_health")).toBe("band_pull_apart");
    expect(getJointHealthActivationFamilyId("prone_external_rotations", "shoulder_health")).toBe(
      "cuff_activation"
    );
    expect(getJointHealthActivationFamilyId("arm_circles", "shoulder_health")).toBe("dynamic_arm_circles");
    expect(getJointHealthActivationFamilyId("push_up_plus", "shoulder_health")).toBe("serratus_activation");
  });

  it("blocks a second pick from the same activation family", () => {
    const used = new Set(["wall_slide"]);
    expect(
      jointHealthActivationFamilyAlreadyUsed(used, "wall_slides_with_lift_off", "shoulder_health")
    ).toBe(true);
    expect(jointHealthActivationFamilyAlreadyUsed(used, "band_pullapart", "shoulder_health")).toBe(false);
  });

  it("groups hip cossack and 90/90 variants into separate families", () => {
    expect(getJointHealthActivationFamilyId("hip_90_90", "hip_health")).toBe("ninety_ninety");
    expect(getJointHealthActivationFamilyId("ff_bodyweight_cossack_squat", "hip_health")).toBe("cossack_mobility");
    expect(getJointHealthActivationFamilyId("clamshell", "hip_health")).toBe("clam_hydrant");
    expect(getJointHealthActivationFamilyId("hip_cars", "hip_health")).toBe("hip_cars");
  });

  it("blocks duplicate hip activation families in one session", () => {
    const used = new Set(["ff_bodyweight_cossack_squat"]);
    expect(jointHealthActivationFamilyAlreadyUsed(used, "cossack_squat", "hip_health")).toBe(true);
    expect(jointHealthActivationFamilyAlreadyUsed(used, "hip_cars", "hip_health")).toBe(false);
  });

  it("groups ankle activation patterns into separate families", () => {
    expect(getJointHealthActivationFamilyId("ankle_cars", "ankle_foot_health")).toBe("ankle_cars");
    expect(getJointHealthActivationFamilyId("heel_walks", "ankle_foot_health")).toBe("gait_walks");
    expect(getJointHealthActivationFamilyId("tibialis_raise", "ankle_foot_health")).toBe("tibialis_activation");
    expect(getJointHealthActivationFamilyId("banded_ankle_mob", "ankle_foot_health")).toBe("banded_ankle_mob");
  });

  it("groups back/spine prep into distinct families", () => {
    expect(getJointHealthActivationFamilyId("cat_camel", "back_spine_health")).toBe("cat_cow");
    expect(getJointHealthActivationFamilyId("open_books", "back_spine_health")).toBe("open_book");
    expect(getJointHealthActivationFamilyId("thread_the_needle", "back_spine_health")).toBe("thread_needle");
    expect(getJointHealthActivationFamilyId("breathing_diaphragmatic", "back_spine_health")).toBe(
      "diaphragmatic_breathing"
    );
  });

  it("groups elbow/wrist prep into distinct families", () => {
    expect(getJointHealthActivationFamilyId("wrist_circles", "elbow_wrist_health")).toBe("wrist_circles");
    expect(getJointHealthActivationFamilyId("finger_extensions", "elbow_wrist_health")).toBe("finger_intrinsic");
    expect(getJointHealthActivationFamilyId("band_pullapart", "elbow_wrist_health")).toBe("band_pull_apart");
    expect(getJointHealthActivationFamilyId("push_up_plus", "elbow_wrist_health")).toBe("serratus_activation");
    expect(getJointHealthActivationFamilyId("prone_external_rotations", "elbow_wrist_health")).toBe(
      "rotator_upstream"
    );
  });
});
