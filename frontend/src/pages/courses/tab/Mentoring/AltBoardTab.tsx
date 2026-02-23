import { useEffect, useState } from "react";
import { useAppNavigate } from "hooks/useAppNavigate";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Button from "components/button/Button";
import { TBoard } from "types/board";

type Props = {
  syllabusId: string;
};

const AltBoardTab = ({ syllabusId }: Props) => {
  const navigate = useAppNavigate();
  const { SyllabusAPI } = useAPIv2();

  const [altBoard, setAltBoard] = useState<TBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

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
            marginBottom: "16px",
          }}
        >
          이 수업에 연결된 Alt Board가 없습니다.
        </p>
        <Button
          type="ghost"
          onClick={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? "생성 중..." : "Alt Board 생성"}
        </Button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "16px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: "var(--background-color-2)",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--text-color-1)",
              marginBottom: "4px",
            }}
          >
            {altBoard.name}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-color-2)",
            }}
          >
            양식, 시트, 문서를 관리하는 Alt Board
          </div>
        </div>
        <Button
          type="ghost"
          onClick={() => navigate(`/boards/${altBoard._id}`)}
        >
          보드 열기
        </Button>
      </div>
    </div>
  );
};

export default AltBoardTab;
