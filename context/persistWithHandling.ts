type PersistWithHandlingParams = {
  operation: string;
  action: () => Promise<unknown>;
  rollback?: () => void;
  /** Called after logging when persistence fails (e.g. user-visible Alert). */
  onFailure?: (error: unknown) => void;
};

export async function persistWithHandling({
  operation,
  action,
  rollback,
  onFailure,
}: PersistWithHandlingParams): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (error) {
    console.error("[AppStatePersistenceError]", {
      operation,
      error,
    });
    onFailure?.(error);
    if (rollback) {
      try {
        rollback();
      } catch (rollbackError) {
        console.error("[AppStatePersistenceRollbackError]", {
          operation,
          rollbackError,
        });
      }
    }
    return false;
  }
}
