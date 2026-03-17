import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HAS_ENTERED_KEY = "todayfit_has_entered";

type WelcomeContextValue = {
  hasEntered: boolean;
  isHydrated: boolean;
  setHasEntered: () => void;
};

const WelcomeContext = createContext<WelcomeContextValue | undefined>(undefined);

export function WelcomeProvider({ children }: { children: React.ReactNode }) {
  const [hasEntered, setHasEnteredState] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Guard against environments where AsyncStorage native module is unavailable
    if (!AsyncStorage || typeof AsyncStorage.getItem !== "function") {
      setIsHydrated(true);
      return;
    }

    AsyncStorage.getItem(HAS_ENTERED_KEY)
      .then((value) => {
        setHasEnteredState(value === "true");
      })
      .catch(() => {
        // On any storage error, fall back to default state but still mark hydrated
        setHasEnteredState(false);
      })
      .finally(() => {
        setIsHydrated(true);
      });
  }, []);

  const setHasEntered = () => {
    setHasEnteredState(true);
    if (!AsyncStorage || typeof AsyncStorage.setItem !== "function") {
      return;
    }
    AsyncStorage.setItem(HAS_ENTERED_KEY, "true").catch(() => {
      // Ignore write errors for now
    });
  };

  const value: WelcomeContextValue = { hasEntered, isHydrated, setHasEntered };
  return (
    <WelcomeContext.Provider value={value}>{children}</WelcomeContext.Provider>
  );
}

export function useWelcome(): WelcomeContextValue {
  const ctx = useContext(WelcomeContext);
  if (!ctx) {
    throw new Error("useWelcome must be used within WelcomeProvider");
  }
  return ctx;
}
