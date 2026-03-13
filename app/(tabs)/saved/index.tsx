import React, { useEffect } from "react";
import { InteractionManager } from "react-native";
import { useRouter, useRootNavigationState } from "expo-router";

export default function SavedWorkoutsScreen() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    const task = InteractionManager.runAfterInteractions(() => {
      router.replace("/library");
    });
    return () => task.cancel();
  }, [router, rootNavigationState?.key]);

  return null;
}
