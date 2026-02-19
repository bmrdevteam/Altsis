import { useCallback, useEffect, useRef, useState } from "react";

export type DraftData = {
  content: string;
  title?: string;
  savedAt: number;
};

const DRAFT_PREFIX = "editor-draft-";
const SAVE_INTERVAL = 30_000; // 30초
const EXPIRE_MS = 7 * 24 * 60 * 60 * 1000; // 7일

export function useEditorDraft(draftKey?: string) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const getDataRef = useRef<(() => DraftData) | null>(null);

  const storageKey = draftKey ? `${DRAFT_PREFIX}${draftKey}` : null;

  // 드래프트 존재 여부 확인
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: DraftData = JSON.parse(raw);
        if (Date.now() - parsed.savedAt > EXPIRE_MS) {
          localStorage.removeItem(storageKey);
          return;
        }
        if (parsed.content?.trim()) {
          setDraftData(parsed);
          setHasDraft(true);
        }
      }
    } catch {
      // 파싱 실패 시 무시
    }
  }, [storageKey]);

  const saveDraft = useCallback(
    (data: DraftData) => {
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch {
        // quota 초과 시 무시
      }
    },
    [storageKey]
  );

  const clearDraft = useCallback(() => {
    if (!storageKey) return;
    localStorage.removeItem(storageKey);
    setHasDraft(false);
    setDraftData(null);
  }, [storageKey]);

  const restoreDraft = useCallback(() => {
    setHasDraft(false);
    return draftData;
  }, [draftData]);

  const dismissDraft = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  // 자동 저장 시작 (getData 콜백 등록)
  const startAutoSave = useCallback(
    (getData: () => DraftData) => {
      getDataRef.current = getData;
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (getDataRef.current && storageKey) {
          const data = getDataRef.current();
          if (data.content?.trim()) {
            saveDraft(data);
          }
        }
      }, SAVE_INTERVAL);
    },
    [storageKey, saveDraft]
  );

  // 클린업
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    hasDraft,
    draftData,
    saveDraft,
    clearDraft,
    restoreDraft,
    dismissDraft,
    startAutoSave,
  };
}
