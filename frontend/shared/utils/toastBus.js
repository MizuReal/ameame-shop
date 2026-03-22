const listeners = new Set();

export function subscribeToast(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function showToast(message, variant = "neutral") {
  listeners.forEach((listener) => {
    try {
      listener({ message, variant });
    } catch (_error) {
      // Keep other listeners running if one fails.
    }
  });
}
