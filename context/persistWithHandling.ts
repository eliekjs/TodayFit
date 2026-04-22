type PersistWithHandlingParams = {
  operation: string;
  action: () => Promise<unknown>;
  rollback?: () => void;
};

export async function persistWithHandling({
  operation,
  action,
  rollback,
}: PersistWithHandlingParams): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (error) {
    console.error("[AppStatePersistenceError]", {
      operation,
      error,
    });
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
