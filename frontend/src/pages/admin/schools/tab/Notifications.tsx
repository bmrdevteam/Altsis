/**
 * @file School Admin - Notifications Management Tab
 *
 * @author
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 */

import { useEffect, useState } from "react";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import Tab from "components/tab/Tab";
import Table from "components/tableV2/Table";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Textarea from "components/textarea/Textarea";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Svg from "assets/svg/Svg";

import { TBoard, TBoardMembers } from "types/board";
import { TSchool } from "types/schools";
import { TNotificationSettings } from "types/notification";

type Props = {
  schoolData: TSchool;
};

// 알림 설정 항목을 카테고리별로 정의
type NotificationSettingItem = {
  key: keyof TNotificationSettings;
  label: string;
  description: string;
};

type NotificationSettingGroup = {
  category: string;
  items: NotificationSettingItem[];
};

const notificationSettingGroups: NotificationSettingGroup[] = [
  {
    category: "일반",
    items: [
      {
        key: "soundEnabled",
        label: "알림음",
        description: "알림이 도착했을 때 소리로 알려줍니다",
      },
    ],
  },
  {
    category: "수업",
    items: [
      {
        key: "classInvitation",
        label: "수업 초대 알림",
        description: "수업에 초대되었을 때 알림을 받습니다",
      },
      {
        key: "classCancellation",
        label: "수업 초대 취소 알림",
        description: "수업 초대가 취소되었을 때 알림을 받습니다",
      },
      {
        key: "classApproval",
        label: "수업 승인 알림",
        description: "수업이 승인되었을 때 알림을 받습니다",
      },
      {
        key: "classApprovalCancel",
        label: "수업 승인 취소 알림",
        description: "수업 승인이 취소되었을 때 알림을 받습니다",
      },
    ],
  },
  {
    category: "일정 및 게시글",
    items: [
      {
        key: "scheduleStart",
        label: "일정 시작 알림",
        description: "일정이 시작될 때 알림을 받습니다",
      },
      {
        key: "newPost",
        label: "새 게시글 알림",
        description: "새 게시글이 등록되었을 때 알림을 받습니다",
      },
    ],
  },
  {
    category: "채팅",
    items: [
      {
        key: "chatMessage",
        label: "채팅 메시지 알림",
        description: "채팅에서 새 메시지가 도착했을 때 알림을 받습니다",
      },
    ],
  },
];

// 알림 설정 섹션 컴포넌트
const NotificationSettingsSection = () => {
  const { NotificationAPI } = useAPIv2();

  const [settings, setSettings] = useState<TNotificationSettings>({
    classInvitation: true,
    classCancellation: true,
    classApproval: true,
    classApprovalCancel: true,
    scheduleStart: true,
    newPost: true,
    chatMessage: true,
    soundEnabled: true,
    reminder: true,
    eventReminderDefault: 15,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoading) {
      NotificationAPI.RNotificationSettings()
        .then(({ settings }) => {
          setSettings(settings);
          setIsLoading(false);
        })
        .catch((err) => {
          ALERT_ERROR(err);
          setIsLoading(false);
        });
    }
  }, [isLoading]);

  const updateSetting = async (
    key: keyof TNotificationSettings,
    value: boolean
  ) => {
    try {
      const newSettings = { ...settings, [key]: value };
      await NotificationAPI.UNotificationSettings({
        data: newSettings,
      });
      setSettings(newSettings);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const cellStyle: React.CSSProperties = {
    padding: "12px 16px",
    textAlign: "left",
    borderBottom: "1px solid var(--border-color)",
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 600,
    fontSize: "13px",
    color: "var(--accent-2)",
    backgroundColor: "var(--component-color)",
  };

  if (isLoading) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "var(--accent-4)" }}>
        로딩 중...
      </div>
    );
  }

  const groupContainerStyle: React.CSSProperties = {
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    overflow: "hidden",
  };

  const groupHeaderStyle: React.CSSProperties = {
    padding: "12px 16px",
    fontWeight: 600,
    fontSize: "13px",
    color: "var(--accent-2)",
    backgroundColor: "var(--component-color)",
    borderBottom: "1px solid var(--border-color)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "24px" }}>
      {notificationSettingGroups.map((group) => (
        <div key={group.category} style={groupContainerStyle}>
          <div style={groupHeaderStyle}>{group.category}</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {group.items.map((item, itemIndex) => (
                <tr key={item.key}>
                  <td
                    style={{
                      ...cellStyle,
                      borderBottom:
                        itemIndex < group.items.length - 1
                          ? "1px solid var(--border-color)"
                          : "none",
                    }}
                  >
                    <div style={{ fontSize: "14px", fontWeight: 500 }}>
                      {item.label}
                    </div>
                  </td>
                  <td
                    style={{
                      ...cellStyle,
                      width: "80px",
                      textAlign: "center",
                      borderBottom:
                        itemIndex < group.items.length - 1
                          ? "1px solid var(--border-color)"
                          : "none",
                    }}
                  >
                    <ToggleSwitch
                      checked={!!settings[item.key]}
                      onChange={(checked: boolean) => {
                        updateSetting(item.key, checked);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

const Notifications = ({ schoolData }: Props) => {
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
    // Table 컴포넌트가 전달하는 데이터에서 일부 필드가 누락될 수 있으므로
    // boards state에서 직접 찾아서 사용
    const board = boards.find((b) => b._id === tableBoard._id);
    if (board) {
      setSelectedBoard(board);
      setShowManagePopup(true);
    }
  };

  // 게시판 관리 탭 콘텐츠
  const BoardManagementContent = (
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
            board.contentViewMode === "gallery"
              ? "갤러리"
              : board.contentViewMode === "blog"
              ? "블로그"
              : "테이블",
          creatorDisplay: board.creatorName || "-",
          membersDisplay: [
            board.members?.groups?.manager && "관리자",
            board.members?.groups?.teacher && "교사",
            board.members?.groups?.student && "학생",
          ]
            .filter(Boolean)
            .join(", ") +
            (board.members?.users?.length
              ? ` +${board.members.users.length}명`
              : ""),
          writersDisplay: [
            board.writers?.groups?.manager && "관리자",
            board.writers?.groups?.teacher && "교사",
            board.writers?.groups?.student && "학생",
          ]
            .filter(Boolean)
            .join(", ") +
            (board.writers?.users?.length
              ? ` +${board.writers.users.length}명`
              : ""),
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
    </div>
  );

  return (
    <div style={{ marginTop: "24px" }}>
      <Tab
        items={{
          "알림 설정": <NotificationSettingsSection />,
          "보드 관리": BoardManagementContent,
        }}
        align="flex-start"
        dontUsePaths
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

// 알림 생성 팝업
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
      alert("알림 이름을 입력해주세요.");
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
      alert("알림이 생성되었습니다.");
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
      title="알림 생성"
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
            label="알림 이름"
            placeholder="알림 이름을 입력하세요"
            onChange={(e: any) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <Textarea
            label="설명 (선택)"
            placeholder="알림에 대한 설명을 입력하세요"
            onChange={(e: any) => setDescription(e.target.value)}
          />
        </div>
      </div>
    </Popup>
  );
};

// 알림 관리 팝업
type ManageBoardPopupProps = {
  board: TBoard;
  setState: (state: boolean) => void;
  onSuccess?: () => void;
};

/** board.members가 없으면 레거시 permissionRead에서 변환 */
const resolveMembers = (board: TBoard): TBoardMembers => {
  if (board.members?.groups) return board.members;
  if (board.permissionRead) {
    return {
      groups: {
        manager: board.permissionRead.manager ?? true,
        teacher: board.permissionRead.teacher ?? true,
        student: board.permissionRead.student ?? true,
      },
      users: [],
    };
  }
  return { groups: { manager: true, teacher: true, student: true }, users: [] };
};

/** board.writers가 없으면 레거시 permissionWrite에서 변환 */
const resolveWriters = (board: TBoard): TBoardMembers => {
  if (board.writers?.groups) return board.writers;
  if (board.permissionWrite) {
    return {
      groups: {
        manager: board.permissionWrite.manager ?? true,
        teacher: board.permissionWrite.teacher ?? true,
        student: board.permissionWrite.student ?? false,
      },
      users: [],
    };
  }
  return {
    groups: { manager: true, teacher: true, student: false },
    users: [],
  };
};

const ManageBoardPopup = ({
  board,
  setState,
  onSuccess,
}: ManageBoardPopupProps) => {
  const { BoardAPI } = useAPIv2();

  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description || "");
  const [members, setMembers] = useState<TBoardMembers>(
    resolveMembers(board)
  );
  const [writers, setWriters] = useState<TBoardMembers>(
    resolveWriters(board)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleMemberGroupChange = (
    role: "manager" | "teacher" | "student",
    checked: boolean
  ) => {
    setMembers((prev) => ({
      ...prev,
      groups: { ...prev.groups, [role]: checked },
    }));
    if (!checked) {
      setWriters((prev) => ({
        ...prev,
        groups: { ...prev.groups, [role]: false },
      }));
    }
  };

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

      await BoardAPI.UBoardMembers({
        params: { _id: board._id },
        data: { groups: members.groups },
      });

      await BoardAPI.UBoardWriters({
        params: { _id: board._id },
        data: { groups: writers.groups },
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

  const roles = [
    { key: "manager" as const, label: "관리자" },
    { key: "teacher" as const, label: "교사" },
    { key: "student" as const, label: "학생" },
  ];

  const cellStyle: React.CSSProperties = {
    padding: "8px 12px",
    textAlign: "center",
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 600,
    fontSize: "13px",
    color: "var(--text-color-2)",
  };

  return (
    <Popup
      setState={setState}
      title="보드 관리"
      closeBtn
      style={{ maxWidth: "600px", width: "100%" }}
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
        {/* 기본 정보 */}
        <div style={{ marginBottom: "24px" }}>
          <h4
            style={{
              marginBottom: "12px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            기본 정보
          </h4>
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

        {/* 권한 설정 */}
        <div>
          <h4
            style={{
              marginBottom: "12px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            권한 설정
          </h4>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...headerCellStyle, textAlign: "left" }}></th>
                {roles.map(({ key, label }) => (
                  <th key={key} style={headerCellStyle}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  style={{
                    ...cellStyle,
                    textAlign: "left",
                    fontWeight: 500,
                  }}
                >
                  멤버
                </td>
                {roles.map(({ key }) => (
                  <td key={key} style={cellStyle}>
                    <ToggleSwitch
                      checked={members.groups[key]}
                      onChange={(checked: boolean) =>
                        handleMemberGroupChange(key, checked)
                      }
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td
                  style={{
                    ...cellStyle,
                    textAlign: "left",
                    fontWeight: 500,
                  }}
                >
                  작성
                </td>
                {roles.map(({ key }) => (
                  <td key={key} style={cellStyle}>
                    {members.groups[key] ? (
                      <ToggleSwitch
                        checked={writers.groups[key]}
                        onChange={(checked: boolean) =>
                          setWriters((prev) => ({
                            ...prev,
                            groups: { ...prev.groups, [key]: checked },
                          }))
                        }
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--text-color-3)",
                        }}
                      >
                        -
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-color-2)",
              marginTop: "8px",
            }}
          >
            멤버: 보드에 접근할 수 있는 역할 / 작성: 게시글을 작성할 수 있는
            역할
          </p>
        </div>
      </div>
    </Popup>
  );
};

export default Notifications;
