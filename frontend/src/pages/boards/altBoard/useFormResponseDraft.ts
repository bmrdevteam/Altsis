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

  // SPA 이동·탭 숨김·키 변경 시 debounce를 기다리지 않고 현재 값을 남긴다.
  // data가 바뀔 때마다 돌리지 않는다 (persist는 dataRef).
  useEffect(() => {
    if (!enabled || !storageKey) return;
    const flush = () => persist();
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      flush();
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [enabled, storageKey, persist]);

  return { lastSavedAt, persist, clear };
}
