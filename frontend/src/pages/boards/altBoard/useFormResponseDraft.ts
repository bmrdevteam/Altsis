import { useCallback, useEffect, useRef, useState } from "react";
import {
  FORM_RESPONSE_DRAFT_DEBOUNCE_MS,
  FORM_RESPONSE_DRAFT_INTERVAL_MS,
  clearFormResponseDraft,
  hasFormResponseDraftContent,
  writeFormResponseDraft,
} from "./formResponseLocalDraft";

type Props = {
  enabled: boolean;
  storageKey: string | null;
  data: Record<string, any>;
};

export function useFormResponseDraft({ enabled, storageKey, data }: Props) {
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const persist = useCallback(() => {
    if (!enabled || !storageKey) return;
    const payload = dataRef.current;
    if (!hasFormResponseDraftContent(payload)) return;
    if (writeFormResponseDraft(storageKey, payload)) {
      setLastSavedAt(Date.now());
    }
  }, [enabled, storageKey]);

  const clear = useCallback(() => {
    clearFormResponseDraft(storageKey);
    setLastSavedAt(null);
  }, [storageKey]);

  useEffect(() => {
    if (!enabled || !storageKey) return;
    const timer = window.setTimeout(persist, FORM_RESPONSE_DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, storageKey, data, persist]);

  useEffect(() => {
    if (!enabled || !storageKey) return;
    const timer = window.setInterval(persist, FORM_RESPONSE_DRAFT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, storageKey, persist]);

  useEffect(() => {
    if (!enabled || !storageKey) return;
    const onLeave = () => persist();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [enabled, storageKey, persist]);

  return { lastSavedAt, persist, clear };
}
