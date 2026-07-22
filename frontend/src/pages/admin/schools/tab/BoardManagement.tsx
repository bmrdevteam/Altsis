import { useEffect, useState } from "react";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import Table from "components/tableV2/Table";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Textarea from "components/textarea/Textarea";
import Svg from "assets/svg/Svg";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";

import { TBoard, TBoardContentViewMode, TBoardNotificationEvents } from "types/board";
import { TSchool } from "types/schools";
import SchoolFeatureToggle from "./FeatureSettings";
import bStyle from "pages/boards/boards.module.scss";

const NOTIFICATION_EVENT_LABELS: Record<
  keyof TBoardNotificationEvents,
  { label: string; description: string }
> = {
  newPost: {
    label: "새 게시글 알림",
    description: "보드에 새 게시글이 등록되면 멤버에게 알림",
  },
  boardInvitation: {
    label: "보드 초대 알림",
    description: "보드에 새 멤버가 초대되면 알림",
  },
  altFormApprovalRequest: {
    label: "승인 요청 알림",
    description: "양식 제출 시 승인자에게 알림",
  },
  altFormApprovalResult: {
    label: "승인 결과 알림",
    description: "승인/반려 시 제출자에게 알림",
  },
  formDeadlineCalendar: {
    label: "양식 마감 일정 등록",
    description: "양식 마감일을 멤버 캘린더에 등록",
  },
};

type Props = {
  schoolData: TSchool;
  setSchoolData?: (data: TSchool) => void;
};

const BoardManagement = ({ schoolData, setSchoolData }: Props) => {
  const { BoardAPI, SchoolAPI } = useAPIv2();

  const [boards, setBoards] = useState<TBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [showManagePopup, setShowManagePopup] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<TBoard | null>(null);

  const boardEnabled = schoolData.boardEnabled !== false;

  useEffect(() => {
    if (isLoading && schoolData?._id && boardEnabled) {
      BoardAPI.RBoards({ query: { school: schoolData._id, mode: "manage" } })
        .then(({ boards }) => {
          setBoards(boards);
          setIsLoading(false);
        })
        .catch((err) => {
          ALERT_ERROR(err);
          setIsLoading(false);
        });
    }
  }, [isLoading, schoolData, boardEnabled]);

  const handleManageClick = (tableBoard: TBoard) => {
    const board = boards.find((b) => b._id === tableBoard._id);
    if (board) {
      setSelectedBoard(board);
      setShowManagePopup(true);
    }
  };

  const handleBoardCreationPermissionToggle = async (
    key: "teacher" | "student",
    value: boolean
  ) => {
    const current = schoolData.boardCreationPermission || {
      teacher: false,
      student: false,
    };
    const updated = { ...current, [key]: value };

    try {
      await SchoolAPI.USchoolBoardCreationPermission({
        params: { _id: schoolData._id },
        data: { boardCreationPermission: updated },
      });
      setSchoolData?.({
        ...schoolData,
        boardCreationPermission: updated,
      });
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleSchoolNotifToggle = async (
    key: keyof TBoardNotificationEvents,
    value: boolean
  ) => {
    const current = schoolData.boardNotificationEvents || {
      newPost: false,
      boardInvitation: false,
      altFormApprovalRequest: false,
      altFormApprovalResult: false,
      formDeadlineCalendar: false,
    };
    const updated = { ...current, [key]: value };

    try {
      await SchoolAPI.USchoolBoardNotificationEvents({
        params: { _id: schoolData._id },
        data: { boardNotificationEvents: updated },
      });
      setSchoolData?.({
        ...schoolData,
        boardNotificationEvents: updated,
      });
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  return (
    <SchoolFeatureToggle
      featureKey="boardEnabled"
      label="보드 기능 활성화"
      description="이 학교에서 보드 및 게시글 기능을 활성화합니다."
      schoolData={schoolData}
      setSchoolData={setSchoolData}
    >
      {/* 보드 생성 권한 설정 */}
      <div
        style={{
          marginBottom: "24px",
          padding: "16px",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          backgroundColor: "var(--background-color-2)",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: "12px",
            color: "var(--text-color)",
          }}
        >
          보드 생성 권한
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-color-2)",
            marginBottom: "12px",
          }}
        >
          관리자는 항상 보드를 생성할 수 있습니다. 교사와 학생의 보드 생성
          권한을 설정합니다.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {(
            [
              { key: "teacher" as const, label: "교사", description: "교사가 보드를 생성할 수 있습니다" },
              { key: "student" as const, label: "학생", description: "학생이 보드를 생성할 수 있습니다" },
            ]
          ).map((item) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500 }}>
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-color-2)",
                    marginTop: "2px",
                  }}
                >
                  {item.description}
                </div>
              </div>
              <ToggleSwitch
                checked={
                  schoolData.boardCreationPermission?.[item.key] ?? false
                }
                onChange={(v) =>
                  handleBoardCreationPermissionToggle(item.key, v)
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* 학교 수준 보드 알림 설정 */}
      <div
        style={{
          marginBottom: "24px",
          padding: "16px",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          backgroundColor: "var(--background-color-2)",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: "12px",
            color: "var(--text-color)",
          }}
        >
          보드 알림 설정 (학교 전체)
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-color-2)",
            marginBottom: "12px",
          }}
        >
          학교 전체에서 비활성화하면 개별 보드 설정과 무관하게 해당 알림이
          발송되지 않습니다.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {(
            Object.keys(NOTIFICATION_EVENT_LABELS) as Array<
              keyof TBoardNotificationEvents
            >
          ).map((key) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500 }}>
                  {NOTIFICATION_EVENT_LABELS[key].label}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-color-2)",
                    marginTop: "2px",
                  }}
                >
                  {NOTIFICATION_EVENT_LABELS[key].description}
                </div>
              </div>
              <ToggleSwitch
                checked={
                  schoolData.boardNotificationEvents?.[key] ?? false
                }
                onChange={(v) => handleSchoolNotifToggle(key, v)}
              />
            </div>
          ))}
        </div>
      </div>

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
            board.contentViewMode === "blog" ? "블로그" : "테이블",
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
    </SchoolFeatureToggle>
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
  const [contentViewMode, setContentViewMode] =
    useState<TBoardContentViewMode>("table");
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
          contentViewMode,
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
        <div style={{ marginBottom: "16px" }}>
          <Textarea
            label="설명 (선택)"
            placeholder="보드에 대한 설명을 입력하세요"
            onChange={(e: any) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <div
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            문서 목록 보기
          </div>
          <div className={bStyle.segmentGroup}>
            <button
              type="button"
              className={`${bStyle.segmentBtn} ${
                contentViewMode === "table" ? bStyle.segmentBtnActive : ""
              }`}
              onClick={() => setContentViewMode("table")}
            >
              테이블
            </button>
            <button
              type="button"
              className={`${bStyle.segmentBtn} ${
                contentViewMode === "blog" ? bStyle.segmentBtnActive : ""
              }`}
              onClick={() => setContentViewMode("blog")}
            >
              블로그
            </button>
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-color-2)",
              marginTop: "6px",
              marginBottom: 0,
            }}
          >
            기본값은 테이블(카드형 목록)입니다.
          </p>
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
  const [contentViewMode, setContentViewMode] = useState<TBoardContentViewMode>(
    board.contentViewMode === "blog" ? "blog" : "table"
  );
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
          contentViewMode,
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
        <div style={{ marginBottom: "16px" }}>
          <Textarea
            label="설명 (선택)"
            placeholder="보드에 대한 설명을 입력하세요"
            defaultValue={description}
            onChange={(e: any) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <div
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "6px",
            }}
          >
            문서 목록 보기
          </div>
          <div className={bStyle.segmentGroup}>
            <button
              type="button"
              className={`${bStyle.segmentBtn} ${
                contentViewMode === "table" ? bStyle.segmentBtnActive : ""
              }`}
              onClick={() => setContentViewMode("table")}
            >
              테이블
            </button>
            <button
              type="button"
              className={`${bStyle.segmentBtn} ${
                contentViewMode === "blog" ? bStyle.segmentBtnActive : ""
              }`}
              onClick={() => setContentViewMode("blog")}
            >
              블로그
            </button>
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-color-2)",
              marginTop: "6px",
              marginBottom: 0,
            }}
          >
            문서 탭 목록 형태입니다. 테이블은 카드형 목록, 블로그는
            피드형입니다.
          </p>
        </div>
      </div>
    </Popup>
  );
};

export default BoardManagement;
