import React, { useEffect } from "react";
import { useRouter } from "expo-router";

export default function SavedWorkoutsScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/library");
  }, [router]);

  return null;
}
