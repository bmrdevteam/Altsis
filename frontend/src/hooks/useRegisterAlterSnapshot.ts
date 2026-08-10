import { useEffect, useRef } from "react";
import {
  TAlterPageContext,
  TAlterSkillId,
  useAlter,
} from "contexts/alterContext";
import { TAlterChatSnapshot } from "utils/alterChatSnapshot";

type Params = {
  enabled?: boolean;
  pageType: TAlterPageContext["pageType"];
  label: string;
  getChatSnapshot: (opts?: {
    dataExpand?: boolean;
  }) => TAlterChatSnapshot | null;
  suggestedSkills?: TAlterSkillId[];
  boardId?: string;
  boardName?: string;
};

/**
 * 읽기 전용 페이지 문맥 등록 (chatSnapshot만).
 * Skill 쓰기(applyDraft 등)가 필요 없는 화면용 공통 헬퍼.
 */
const useRegisterAlterSnapshot = (params: Params) => {
  const { registerPageContext } = useAlter();
  const getChatSnapshotRef = useRef(params.getChatSnapshot);
  getChatSnapshotRef.current = params.getChatSnapshot;

  useEffect(() => {
    if (params.enabled === false) return;

    return registerPageContext({
      pageType: params.pageType,
      label: params.label,
      boardId: params.boardId,
      boardName: params.boardName,
      getChatSnapshot: (opts) => getChatSnapshotRef.current(opts),
      suggestedSkills: params.suggestedSkills?.length
        ? params.suggestedSkills
        : ["chat"],
    });
  }, [
    params.enabled,
    params.pageType,
    params.label,
    params.boardId,
    params.boardName,
    params.suggestedSkills,
    registerPageContext,
  ]);
};

export default useRegisterAlterSnapshot;
