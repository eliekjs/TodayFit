import { Alert } from "react-native";
import type { Router } from "expo-router";
import {
  SESSION_FLOW_LABELS,
  type SessionDraft,
  type SessionFlow,
} from "./sessionDraft";

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
  onFlowStarted?: () => void
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
