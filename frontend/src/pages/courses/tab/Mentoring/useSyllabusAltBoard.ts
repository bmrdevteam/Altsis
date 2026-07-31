import { useCallback, useEffect, useState } from "react";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TBoard } from "types/board";

/**
 * 수업(syllabus)에 연결된 Alt Board 조회·생성·수강생 동기화
 */
export const useSyllabusAltBoard = (syllabusId: string | undefined) => {
  const { SyllabusAPI } = useAPIv2();
  const [altBoard, setAltBoard] = useState<TBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!syllabusId) {
      setAltBoard(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    SyllabusAPI.RSyllabusAltBoard({ params: { _id: syllabusId } })
      .then(({ board }) => {
        setAltBoard(board);
        setIsLoading(false);
      })
      .catch(() => {
        setAltBoard(null);
        setIsLoading(false);
      });
  }, [syllabusId]);

  const createBoard = useCallback(async () => {
    if (!syllabusId) return null;
    setIsCreating(true);
    try {
      const { board } = await SyllabusAPI.CSyllabusAltBoard({
        params: { _id: syllabusId },
      });
      setAltBoard(board);
      return board;
    } catch (err) {
      ALERT_ERROR(err);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [syllabusId, SyllabusAPI]);

  const syncBoard = useCallback(async () => {
    if (!syllabusId) return;
    setIsSyncing(true);
    try {
      const { board, added, removed } =
        await SyllabusAPI.USyllabusAltBoardSync({
          params: { _id: syllabusId },
        });
      setAltBoard(board);
      alert(`동기화 완료: ${added}명 추가, ${removed}명 제거`);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSyncing(false);
    }
  }, [syllabusId, SyllabusAPI]);

  return {
    altBoard,
    isLoading,
    isCreating,
    isSyncing,
    createBoard,
    syncBoard,
  };
};

export default useSyllabusAltBoard;
