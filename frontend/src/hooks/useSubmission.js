import { useCallback, useRef, useState } from "react";

// A ref closes the gap before React renders the disabled button.
export function useSubmission() {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (action) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      return await action();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }, []);
  return { busy, run };
}
