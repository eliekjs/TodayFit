import React, { useEffect } from "react";
import { InteractionManager } from "react-native";
import { useRouter, usePathname } from "expo-router";

export default function WorkoutHistoryScreen() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname == null || pathname === "" || !pathname.startsWith("/history")) return;
    const task = InteractionManager.runAfterInteractions(() => {
      router.replace("/library");
    });
    return () => task.cancel();
  }, [router, pathname]);

  return null;
}
