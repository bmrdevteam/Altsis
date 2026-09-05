import { useCallback, useEffect, useRef, useState } from "react";
import {
  FORM_RESPONSE_DRAFT_DEBOUNCE_MS,
  FORM_RESPONSE_DRAFT_INTERVAL_MS,
  clearFormResponseDraft,
  persistFormResponseDraft,
  persistPreviousDraftBind,
} from "./formResponseLocalDraft";

type Props = {
  enabled: boolean;
  storageKey: string | null;
  data: Record<string, any>;
};

export function useFormResponseDraft({ enabled, storageKey, data }: Props) {
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const boundRef = useRef({ key: storageKey, data });
  // 같은 키에서는 최신 data를 따라간다. 키가 바뀐 렌더에서는 이전 data를 유지해
  // cleanup이 새 화면 값으로 이전 키를 덮지 않게 한다.
  if (boundRef.current.key === storageKey) {
    boundRef.current.data = data;
  }

  const persist = useCallback(() => {
    if (!enabled || !storageKey) return;
    if (boundRef.current.key !== storageKey) return;
    if (persistFormResponseDraft(storageKey, boundRef.current.data)) {
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

  // SPA 이동·탭 숨김·키 변경 시 debounce를 기다리지 않고 남긴다.
  // 키 변경 시 이전 키에는 이전 data만 쓴다.
  useEffect(() => {
    persistPreviousDraftBind(boundRef.current, storageKey);
    boundRef.current = { key: storageKey, data };

    const boundKey = storageKey;
    const flushThisKey = () => {
      if (!enabled || !boundKey) return;
      if (boundRef.current.key !== boundKey) return;
      persistFormResponseDraft(boundKey, boundRef.current.data);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flushThisKey();
    };
    if (enabled && boundKey) {
      window.addEventListener("beforeunload", flushThisKey);
      document.addEventListener("visibilitychange", onHide);
    }
    return () => {
      window.removeEventListener("beforeunload", flushThisKey);
      document.removeEventListener("visibilitychange", onHide);
      if (boundRef.current.key === boundKey) {
        persistFormResponseDraft(boundKey, boundRef.current.data);
      }
    };
    // data는 같은 키에서 boundRef로만 갱신한다. 키 변경 시에만 이 effect를 다시 돈다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, storageKey]);

  return { lastSavedAt, persist, clear };
}
