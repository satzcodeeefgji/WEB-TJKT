export const withTimeout = async <T,>(
  promise: Promise<T>,
  message: string,
  ms = 12000
) => {
  if (typeof document === "undefined") {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), ms);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timeoutId!);
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let visibleStartedAt = performance.now();
  let visibleElapsed = 0;
  let cleanup = () => {};

  const clear = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };

  const timeout = new Promise<never>((_, reject) => {
    const schedule = () => {
      clear();

      if (document.hidden) {
        return;
      }

      const remaining = Math.max(ms - visibleElapsed, 0);
      timeoutId = setTimeout(() => reject(new Error(message)), remaining);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        visibleElapsed += performance.now() - visibleStartedAt;
        clear();
        return;
      }

      visibleStartedAt = performance.now();
      schedule();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    cleanup = () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clear();
    };

    schedule();
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    cleanup();
  }
};
