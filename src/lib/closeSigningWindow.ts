/** Close a signing tab. window.close() only works for script-opened windows. */
export function closeSigningWindow(fallbackPath = "/") {
  try {
    if (window.opener && !window.opener.closed) {
      window.close();
    }
  } catch {
    /* ignore */
  }
  try {
    window.close();
  } catch {
    /* ignore */
  }
  window.setTimeout(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.closed) return;
    } catch {
      /* continue */
    }
    window.location.replace(fallbackPath);
  }, 120);
}
