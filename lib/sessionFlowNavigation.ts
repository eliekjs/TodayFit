import { Alert, Platform } from "react-native";
import type { Router } from "expo-router";
import {
  SESSION_FLOW_LABELS,
  type SessionDraft,
  type SessionFlow,
} from "./sessionDraft";
import type { SessionFlowConflict } from "../components/SessionFlowConflictModal";

export function navigateToSessionFlow(
  router: Router,
  flow: SessionFlow,
  targetHref: string,
  beginSessionFlow: (flow: SessionFlow) => boolean,
  replaceSessionFlow: (flow: SessionFlow) => void,
  activeSessionDraft: SessionDraft | null,
  /**
   * Optional hook run right after the flow is begun/replaced but before navigating —
   * e.g. to apply a saved preset's filters on top of whatever the flow start hydrated.
   */
  onFlowStarted?: () => void,
  /**
   * When provided, conflicts open this UI instead of Alert.alert (required for reliable web UX).
   */
  onConflict?: (conflict: SessionFlowConflict) => void
): void {
  if (beginSessionFlow(flow)) {
    onFlowStarted?.();
    router.push(targetHref as never);
    return;
  }
  if (!activeSessionDraft) {
    replaceSessionFlow(flow);
    onFlowStarted?.();
    router.push(targetHref as never);
    return;
  }

  const conflict: SessionFlowConflict = {
    currentFlow: activeSessionDraft.flow,
    nextFlow: flow,
    resumeRoute: activeSessionDraft.resumeRoute,
    targetHref,
  };

  if (onConflict) {
    onConflict(conflict);
    return;
  }

  // Native Alert works on iOS/Android; web Alert.alert often fails to show action buttons.
  if (Platform.OS === "web") {
    const startNew =
      typeof window !== "undefined" &&
      window.confirm(
        `You're already building ${SESSION_FLOW_LABELS[activeSessionDraft.flow]}.\n\nOK = discard and start ${SESSION_FLOW_LABELS[flow]}\nCancel = keep your current session`
      );
    if (startNew) {
      replaceSessionFlow(flow);
      onFlowStarted?.();
      router.push(targetHref as never);
    }
    return;
  }

  Alert.alert(
    "Session in progress",
    `You're already building ${SESSION_FLOW_LABELS[activeSessionDraft.flow]}. Continue that or start a new ${SESSION_FLOW_LABELS[flow]} session?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Continue",
        onPress: () => router.push(activeSessionDraft.resumeRoute as never),
      },
      {
        text: "Start new",
        style: "destructive",
        onPress: () => {
          replaceSessionFlow(flow);
          onFlowStarted?.();
          router.push(targetHref as never);
        },
      },
    ]
  );
}
