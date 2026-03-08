import { useEffect, useState } from "react";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Button from "components/button/Button";
import { TBoard } from "types/board";
import AltBoardView from "pages/boards/altBoard/AltBoardView";

type Props = {
  syllabusId: string;
  canCreate?: boolean;
};

const AltBoardTab = ({ syllabusId, canCreate = true }: Props) => {
  const { SyllabusAPI } = useAPIv2();

  const [altBoard, setAltBoard] = useState<TBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    SyllabusAPI.RSyllabusAltBoard({ params: { _id: syllabusId } })
      .then(({ board }) => {
        setAltBoard(board);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [syllabusId]);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const { board } = await SyllabusAPI.CSyllabusAltBoard({
        params: { _id: syllabusId },
      });
      setAltBoard(board);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSync = async () => {
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
  };

  if (isLoading) return null;

  if (!altBoard) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 20px",
        }}
      >
        <p
          style={{
            color: "var(--text-color-2)",
            fontSize: "14px",
            marginBottom: canCreate ? "16px" : "0",
          }}
        >
          이 수업에 연결된 Alt Board가 없습니다.
        </p>
        {canCreate && (
          <Button
            type="ghost"
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? "생성 중..." : "Alt Board 생성"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      {canCreate && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px 0" }}>
          <Button
            type="ghost"
            onClick={handleSync}
            disabled={isSyncing}
            style={{ fontSize: "13px" }}
          >
            {isSyncing ? "동기화 중..." : "수강생 동기화"}
          </Button>
        </div>
      )}
      <AltBoardView board={altBoard} embedded />
    </>
  );
};

export default AltBoardTab;
