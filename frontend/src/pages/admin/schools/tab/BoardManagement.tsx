import { useEffect, useState } from "react";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import Table from "components/tableV2/Table";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Textarea from "components/textarea/Textarea";
import Svg from "assets/svg/Svg";

import { TBoard } from "types/board";
import { TSchool } from "types/schools";

type Props = {
  schoolData: TSchool;
};

const BoardManagement = ({ schoolData }: Props) => {
  const { BoardAPI } = useAPIv2();

  const [boards, setBoards] = useState<TBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [showManagePopup, setShowManagePopup] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<TBoard | null>(null);

  useEffect(() => {
    if (isLoading && schoolData?._id) {
      BoardAPI.RBoards({ query: { school: schoolData._id } })
        .then(({ boards }) => {
          setBoards(boards);
          setIsLoading(false);
        })
        .catch((err) => {
          ALERT_ERROR(err);
          setIsLoading(false);
        });
    }
  }, [isLoading, schoolData]);

  const handleManageClick = (tableBoard: TBoard) => {
    const board = boards.find((b) => b._id === tableBoard._id);
    if (board) {
      setSelectedBoard(board);
      setShowManagePopup(true);
    }
  };

  return (
    <div style={{ marginTop: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "16px",
        }}
      >
        <Button type="ghost" onClick={() => setShowCreatePopup(true)}>
          <>
            <Svg type="plus" width="16px" height="16px" />
            보드 추가
          </>
        </Button>
      </div>

      <Table
        type="object-array"
        data={boards.map((board) => ({
          ...board,
          postCountDisplay: board.postCount || 0,
          boardTypeDisplay: board.boardType === "user" ? "사용자" : "공식",
          contentViewModeDisplay:
            board.contentViewMode === "blog"
              ? "블로그"
              : "테이블",
          creatorDisplay: board.creatorName || "-",
          membersDisplay: board.isDefault
            ? "전체"
            : board.members?.users?.length
              ? `${board.members.users.length}명`
              : "-",
          writersDisplay: board.writers?.users?.length
            ? `${board.writers.users.length}명`
            : "-",
        }))}
        defaultPageBy={10}
        header={[
          {
            text: "이름",
            key: "name",
            type: "text",
          },
          {
            text: "유형",
            key: "boardTypeDisplay",
            type: "text",
            width: "80px",
            textAlign: "center",
          },
          {
            text: "뷰 모드",
            key: "contentViewModeDisplay",
            type: "text",
            width: "80px",
            textAlign: "center",
          },
          {
            text: "생성자",
            key: "creatorDisplay",
            type: "text",
            width: "100px",
          },
          {
            text: "글 수",
            key: "postCountDisplay",
            type: "text",
            width: "60px",
            textAlign: "center",
          },
          {
            text: "멤버",
            key: "membersDisplay",
            type: "text",
            width: "150px",
          },
          {
            text: "작성 권한",
            key: "writersDisplay",
            type: "text",
            width: "150px",
          },
          {
            text: "관리",
            key: "_id",
            type: "button",
            onClick: (e: TBoard) => handleManageClick(e),
            width: "80px",
            textAlign: "center",
            btnStyle: {
              border: true,
              color: "var(--accent-1)",
              padding: "4px",
              round: true,
            },
          },
        ]}
      />

      {showCreatePopup && (
        <CreateBoardPopup
          schoolId={schoolData._id}
          setState={setShowCreatePopup}
          onSuccess={() => setIsLoading(true)}
        />
      )}

      {showManagePopup && selectedBoard && (
        <ManageBoardPopup
          board={selectedBoard}
          setState={setShowManagePopup}
          onSuccess={() => setIsLoading(true)}
        />
      )}
    </div>
  );
};

type CreateBoardPopupProps = {
  schoolId: string;
  setState: (state: boolean) => void;
  onSuccess?: () => void;
};

const CreateBoardPopup = ({
  schoolId,
  setState,
  onSuccess,
}: CreateBoardPopupProps) => {
  const { BoardAPI } = useAPIv2();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("보드 이름을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      await BoardAPI.CBoard({
        data: {
          school: schoolId,
          name: name.trim(),
          description: description.trim(),
        },
      });
      alert("보드가 생성되었습니다.");
      setState(false);
      onSuccess?.();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popup
      setState={setState}
      title="보드 생성"
      closeBtn
      style={{ maxWidth: "500px", width: "100%" }}
      footer={
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <Button type="ghost" onClick={() => setState(false)}>
            취소
          </Button>
          <Button type="ghost" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "생성 중..." : "생성"}
          </Button>
        </div>
      }
    >
      <div>
        <div style={{ marginBottom: "16px" }}>
          <Input
            label="보드 이름"
            placeholder="보드 이름을 입력하세요"
            onChange={(e: any) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <Textarea
            label="설명 (선택)"
            placeholder="보드에 대한 설명을 입력하세요"
            onChange={(e: any) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </Popup>
  );
};

type ManageBoardPopupProps = {
  board: TBoard;
  setState: (state: boolean) => void;
  onSuccess?: () => void;
};

const ManageBoardPopup = ({
  board,
  setState,
  onSuccess,
}: ManageBoardPopupProps) => {
  const { BoardAPI } = useAPIv2();

  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("보드 이름을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      await BoardAPI.UBoard({
        params: { _id: board._id },
        data: {
          name: name.trim(),
          description: description.trim(),
        },
      });

      alert("저장되었습니다.");
      setState(false);
      onSuccess?.();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (board.isDefault) {
      alert("기본 보드는 삭제할 수 없습니다.");
      return;
    }

    if (!window.confirm("정말 삭제하시겠습니까? 글도 함께 삭제됩니다.")) {
      return;
    }

    setIsDeleting(true);

    try {
      await BoardAPI.DBoard({ params: { _id: board._id } });
      alert("삭제되었습니다.");
      setState(false);
      onSuccess?.();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Popup
      setState={setState}
      title="보드 관리"
      closeBtn
      style={{ maxWidth: "500px", width: "100%" }}
      footer={
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "space-between",
          }}
        >
          <div>
            {!board.isDefault && (
              <Button
                type="ghost"
                onClick={handleDelete}
                disabled={isDeleting}
                style={{ color: "var(--red)" }}
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </Button>
            )}
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <Button type="ghost" onClick={() => setState(false)}>
              취소
            </Button>
            <Button type="ghost" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      }
    >
      <div>
        <div style={{ marginBottom: "16px" }}>
          <Input
            label="보드 이름"
            placeholder="보드 이름을 입력하세요"
            defaultValue={name}
            onChange={(e: any) => setName(e.target.value)}
            required
            disabled={board.isDefault}
          />
          {board.isDefault && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-color-2)",
                marginTop: "4px",
              }}
            >
              기본 보드의 이름은 변경할 수 없습니다.
            </p>
          )}
        </div>
        <div>
          <Textarea
            label="설명 (선택)"
            placeholder="보드에 대한 설명을 입력하세요"
            defaultValue={description}
            onChange={(e: any) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </Popup>
  );
};

export default BoardManagement;
