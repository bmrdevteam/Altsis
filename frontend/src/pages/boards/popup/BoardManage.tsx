/**
 * @file Board Manage Popup
 *
 * @author
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import _ from "lodash";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Button from "components/button/Button";
import Textarea from "components/textarea/Textarea";
import CourseCoverImageEditor from "pages/courses/view/CourseCoverImageEditor";

import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";

import {
  TBoard,
  TBoardContentViewMode,
  TBoardMembers,
  TBoardNotificationEvents,
  TMemberUser,
} from "types/board";

import bStyle from "../boards.module.scss";

type Props = {
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
      users: (board.permissionRead.exceptions || [])
        .filter((e) => e.isAllowed)
        .map((e) => ({ user: e.user, userId: e.userId, userName: e.userName })),
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
      users: (board.permissionWrite.exceptions || [])
        .filter((e) => e.isAllowed)
        .map((e) => ({ user: e.user, userId: e.userId, userName: e.userName })),
    };
  }
  return {
    groups: { manager: true, teacher: true, student: false },
    users: [],
  };
};

const NOTIF_LABELS: Record<
  keyof TBoardNotificationEvents,
  { label: string; desc: string }
> = {
  newPost: { label: "새 게시글 알림", desc: "새 게시글 등록 시 멤버에게 알림" },
  boardInvitation: { label: "보드 초대 알림", desc: "새 멤버 초대 시 알림" },
  altFormApprovalRequest: { label: "승인 요청 알림", desc: "양식 제출·다음 단계 시 승인자에게 알림" },
  altFormApprovalResult: { label: "승인 결과 알림", desc: "단계·최종 승인/반려 시 제출자에게 알림" },
  formDeadlineCalendar: { label: "양식 마감 일정 등록", desc: "양식 마감일을 멤버 캘린더에 등록" },
};

const BoardManagePopup = ({ board, setState, onSuccess }: Props) => {
  const { currentRegistration, currentSeason, currentSchool } = useAuth();
  const { BoardAPI, RegistrationAPI } = useAPIv2();

  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description || "");

  // 새 멤버/작성자 구조
  const initialMembers = resolveMembers(board);
  const initialWriters = resolveWriters(board);
  const [members, setMembers] = useState<TBoardMembers>(initialMembers);
  const [writers, setWriters] = useState<TBoardMembers>(initialWriters);

  const [notifEvents, setNotifEvents] = useState<TBoardNotificationEvents>(
    board.notificationEvents || {
      newPost: false,
      boardInvitation: false,
      altFormApprovalRequest: false,
      altFormApprovalResult: false,
      formDeadlineCalendar: false,
    }
  );

  const [chatEnabled, setChatEnabled] = useState(board.chatEnabled !== false);
  const [contentViewMode, setContentViewMode] = useState<TBoardContentViewMode>(
    board.contentViewMode === "blog" ? "blog" : "table"
  );

  const [coverColor, setCoverColor] = useState(board.coverColor || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const schoolChatEnabled =
    currentSchool?.chatEnabled !== false &&
    currentSchool?.academyFeatures?.chatEnabled !== false;

  // 쿼터 사용자 목록 (초대용)
  const [registrationList, setRegistrationList] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [writerSearch, setWriterSearch] = useState("");

  const coverFileRef = useRef<File | null>(null);
  const coverUrlRef = useRef<string>("");
  const [coverRemoved, setCoverRemoved] = useState(false);

  useEffect(() => {
    const seasonId =
      board.scope === "season" && board.season
        ? board.season
        : currentRegistration?.season || currentSeason?._id;
    if (seasonId) {
      RegistrationAPI.RRegistrations({
        query: { season: seasonId },
      })
        .then(({ registrations }) => {
          const list = _.uniqBy(registrations, "userId");
          setRegistrationList(list);

          // altBoardRole에서 멤버 자동 복원 (기존 보드 마이그레이션)
          if (board.altBoardRole && initialMembers.users.length === 0) {
            const altMembers: { user: string; userId: string; userName: string }[] = [];
            const altWriters: { user: string; userId: string; userName: string }[] = [];
            for (const [userOid, role] of Object.entries(board.altBoardRole)) {
              const reg = list.find((r: any) => r.user === userOid);
              if (reg) {
                altMembers.push({
                  user: reg.user,
                  userId: reg.userId,
                  userName: reg.userName,
                });
                if (role === "admin" || role === "writer") {
                  altWriters.push({
                    user: reg.user,
                    userId: reg.userId,
                    userName: reg.userName,
                  });
                }
              }
            }
            if (altMembers.length > 0) {
              setMembers((prev) => ({
                ...prev,
                users: _.uniqBy([...prev.users, ...altMembers], (x) => x.userId),
              }));
            }
            if (altWriters.length > 0) {
              setWriters((prev) => ({
                ...prev,
                users: _.uniqBy([...prev.users, ...altWriters], (x) => x.userId),
              }));
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  /** 멤버 체크박스 토글 */
  const handleToggleMember = (
    u: { user: string; userId: string; userName: string },
    checked: boolean
  ) => {
    if (checked) {
      setMembers((prev) => ({
        ...prev,
        users: _.uniqBy(
          [...prev.users, { user: u.user, userId: u.userId, userName: u.userName }],
          (x) => x.userId
        ),
      }));
    } else {
      setMembers((prev) => ({
        ...prev,
        users: prev.users.filter((x) => x.userId !== u.userId),
      }));
      // 멤버에서 해제하면 작성자에서도 제거
      setWriters((prev) => ({
        ...prev,
        users: prev.users.filter((x) => x.userId !== u.userId),
      }));
    }
  };

  /** 작성자 체크박스 토글 */
  const handleToggleWriter = (u: TMemberUser, checked: boolean) => {
    if (checked) {
      setWriters((prev) => ({
        ...prev,
        users: _.uniqBy([...prev.users, u], (x) => x.userId),
      }));
    } else {
      setWriters((prev) => ({
        ...prev,
        users: prev.users.filter((x) => x.userId !== u.userId),
      }));
    }
  };

  /** 멤버 전체 선택/해제 (그룹 단위) */
  const handleToggleAllMembers = (
    users: { user: string; userId: string; userName: string }[],
    checked: boolean
  ) => {
    if (checked) {
      setMembers((prev) => ({
        ...prev,
        users: _.uniqBy(
          [
            ...prev.users,
            ...users.map((u) => ({
              user: u.user,
              userId: u.userId,
              userName: u.userName,
            })),
          ],
          (x) => x.userId
        ),
      }));
    } else {
      const removeIds = new Set(users.map((u) => u.userId));
      setMembers((prev) => ({
        ...prev,
        users: prev.users.filter((x) => !removeIds.has(x.userId)),
      }));
      setWriters((prev) => ({
        ...prev,
        users: prev.users.filter((x) => !removeIds.has(x.userId)),
      }));
    }
  };

  /** 작성자 전체 선택/해제 */
  const handleToggleAllWriters = (
    users: { user: string; userId: string; userName: string }[],
    checked: boolean
  ) => {
    if (checked) {
      setWriters((prev) => ({
        ...prev,
        users: _.uniqBy(
          [
            ...prev.users,
            ...users.map((u) => ({
              user: u.user,
              userId: u.userId,
              userName: u.userName,
            })),
          ],
          (x) => x.userId
        ),
      }));
    } else {
      const removeIds = new Set(users.map((u) => u.userId));
      setWriters((prev) => ({
        ...prev,
        users: prev.users.filter((x) => !removeIds.has(x.userId)),
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
      // 1. 기본 정보 수정
      await BoardAPI.UBoard({
        params: { _id: board._id },
        data: {
          name: name.trim(),
          description: description.trim(),
          coverColor: coverColor || undefined,
          notificationEvents: notifEvents,
          chatEnabled,
          contentViewMode,
        },
      });

      // 2. 커버 이미지 처리
      if (coverRemoved) {
        await BoardAPI.DBoardCoverImage({ params: { _id: board._id } });
      }
      if (coverFileRef.current) {
        const formData = new FormData();
        formData.append("img", coverFileRef.current);
        await BoardAPI.UBoardCoverImage({
          params: { _id: board._id },
          data: formData,
        });
      }

      // 3. 개별 멤버 동기화
      const prevMemberUserIds = new Set(
        initialMembers.users.map((u) => u.userId)
      );
      const newMemberUserIds = new Set(members.users.map((u) => u.userId));

      for (const u of members.users) {
        if (!prevMemberUserIds.has(u.userId)) {
          await BoardAPI.CBoardMemberUser({
            params: { _id: board._id },
            data: { user: u.user, userId: u.userId, userName: u.userName },
          });
        }
      }
      for (const u of initialMembers.users) {
        if (!newMemberUserIds.has(u.userId)) {
          await BoardAPI.DBoardMemberUser({
            params: { _id: board._id },
            query: { userId: u.userId },
          });
        }
      }

      // 4. 개별 작성자 동기화
      const prevWriterUserIds = new Set(
        initialWriters.users.map((u) => u.userId)
      );
      const newWriterUserIds = new Set(writers.users.map((u) => u.userId));

      for (const u of writers.users) {
        if (!prevWriterUserIds.has(u.userId)) {
          await BoardAPI.CBoardWriterUser({
            params: { _id: board._id },
            data: { user: u.user, userId: u.userId, userName: u.userName },
          });
        }
      }
      for (const u of initialWriters.users) {
        if (!newWriterUserIds.has(u.userId)) {
          await BoardAPI.DBoardWriterUser({
            params: { _id: board._id },
            query: { userId: u.userId },
          });
        }
      }

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

  /** 그룹 헤더 스타일 */
  const groupHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-color-2)",
    backgroundColor: "var(--background-color-2)",
    borderBottom: "1px solid var(--border-color)",
    cursor: "pointer",
  };

  /** 체크박스 리스트 렌더링 */
  const renderCheckboxList = (
    items: { user: string; userId: string; userName: string; role?: string }[],
    selectedIds: Set<string>,
    onToggle: (
      u: { user: string; userId: string; userName: string },
      checked: boolean
    ) => void,
    onToggleAll: (
      users: { user: string; userId: string; userName: string }[],
      checked: boolean
    ) => void,
    searchTerm: string,
    grouped?: boolean
  ) => {
    const filtered = items.filter(
      (u) =>
        !searchTerm ||
        u.userName.includes(searchTerm) ||
        u.userId.includes(searchTerm)
    );

    if (filtered.length === 0) {
      return (
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            fontSize: "13px",
            color: "var(--text-color-2)",
          }}
        >
          {searchTerm ? "검색 결과가 없습니다." : "사용자가 없습니다."}
        </div>
      );
    }

    const renderRow = (u: {
      user: string;
      userId: string;
      userName: string;
    }) => (
      <label
        key={u.userId}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={selectedIds.has(u.userId)}
          onChange={(e) => onToggle(u, e.target.checked)}
        />
        <span style={{ fontSize: "13px" }}>
          {u.userName}({u.userId})
        </span>
      </label>
    );

    const renderGroupHeader = (
      label: string,
      groupItems: { user: string; userId: string; userName: string }[],
      extraStyle?: React.CSSProperties
    ) => {
      const allSelected = groupItems.every((u) => selectedIds.has(u.userId));
      return (
        <label style={{ ...groupHeaderStyle, ...extraStyle }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onToggleAll(groupItems, e.target.checked)}
          />
          {label} ({groupItems.length})
        </label>
      );
    };

    if (!grouped) {
      const allSelected = filtered.every((u) => selectedIds.has(u.userId));
      return (
        <>
          <label style={groupHeaderStyle}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => onToggleAll(filtered, e.target.checked)}
            />
            전체 선택 ({filtered.length})
          </label>
          {filtered.map(renderRow)}
        </>
      );
    }

    const teachers = filtered.filter((u) => u.role === "teacher");
    const students = filtered.filter((u) => u.role === "student");

    return (
      <>
        {teachers.length > 0 && (
          <>
            {renderGroupHeader("교사", teachers)}
            {teachers.map(renderRow)}
          </>
        )}
        {students.length > 0 && (
          <>
            {renderGroupHeader("학생", students, {
              borderTop:
                teachers.length > 0
                  ? "1px solid var(--border-color)"
                  : undefined,
            })}
            {students.map(renderRow)}
          </>
        )}
      </>
    );
  };

  return (
    <Popup
      setState={setState}
      title="보드 관리"
      closeBtn
      contentScroll
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
            <Button
              type="ghost"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
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
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "6px",
              }}
            >
              보드 범위
            </div>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-color)",
                margin: 0,
              }}
            >
              {board.scope === "season"
                ? board.seasonYear && board.seasonTerm
                  ? `시즌 (${board.seasonYear} ${board.seasonTerm})`
                  : "시즌"
                : "학교 전체"}
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-color-2)",
                marginTop: "4px",
                marginBottom: 0,
              }}
            >
              생성 후 범위는 변경할 수 없습니다.
              {board.scope === "season"
                ? " 해당 시즌 등록자만 초대·접근할 수 있습니다."
                : ""}
            </p>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <Textarea
              label="설명 (선택)"
              placeholder="보드에 대한 설명을 입력하세요"
              defaultValue={description}
              onChange={(e: any) => setDescription(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: "16px" }}>
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
              문서 탭 목록 형태입니다. 보드 멤버 전체에 적용됩니다. 테이블은
              카드형 목록, 블로그는 피드형입니다.
            </p>
          </div>
          <div style={{ marginTop: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "6px",
              }}
            >
              커버
            </label>
            <CourseCoverImageEditor
              coverImage={board.coverImage}
              coverColor={coverColor}
              onImageSelected={(file) => {
                coverFileRef.current = file;
                coverUrlRef.current = "";
                setCoverRemoved(false);
              }}
              onImageUrlSet={(url) => {
                coverUrlRef.current = url;
                coverFileRef.current = null;
                setCoverRemoved(false);
              }}
              onImageRemoved={() => {
                coverFileRef.current = null;
                coverUrlRef.current = "";
                setCoverRemoved(true);
              }}
              onColorChanged={(color) => setCoverColor(color)}
            />
          </div>

          {board.creatorName && (
            <div
              style={{
                marginTop: "16px",
                fontSize: "12px",
                color: "var(--text-color-2)",
              }}
            >
              생성자: {board.creatorName}
              {board.boardType === "user" && " (사용자 보드)"}
            </div>
          )}
        </div>

        {/* 멤버 */}
        <div style={{ marginBottom: "24px" }}>
          <h4
            style={{
              marginBottom: "4px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            멤버
          </h4>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-color-2)",
              marginBottom: "8px",
            }}
          >
            이 보드에 접근할 수 있는 사람을 초대합니다.
          </p>

          <input
            type="text"
            placeholder="이름 또는 아이디로 검색"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              fontSize: "13px",
              backgroundColor: "var(--background-color-1)",
              color: "var(--accent-1)",
              boxSizing: "border-box",
            }}
          />
          <div
            style={{
              maxHeight: "240px",
              overflowY: "auto",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              marginTop: "8px",
            }}
          >
            {renderCheckboxList(
              registrationList,
              new Set(members.users.map((u) => u.userId)),
              handleToggleMember,
              handleToggleAllMembers,
              memberSearch,
              true
            )}
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-color-2)",
              marginTop: "4px",
            }}
          >
            {members.users.length > 0
              ? `${members.users.length}명 선택됨`
              : "선택된 멤버가 없습니다."}
          </p>
        </div>

        {/* 작성 권한 */}
        <div>
          <h4
            style={{
              marginBottom: "4px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            작성 권한
          </h4>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-color-2)",
              marginBottom: "8px",
            }}
          >
            이 보드에 게시글을 작성할 수 있는 사람을 설정합니다.
          </p>

          {members.users.length > 0 ? (
            <>
              <input
                type="text"
                placeholder="이름 또는 아이디로 검색"
                value={writerSearch}
                onChange={(e) => setWriterSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  fontSize: "13px",
                  backgroundColor: "var(--background-color-1)",
                  color: "var(--accent-1)",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  maxHeight: "200px",
                  overflowY: "auto",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  marginTop: "8px",
                }}
              >
                {renderCheckboxList(
                  members.users,
                  new Set(writers.users.map((u) => u.userId)),
                  handleToggleWriter,
                  handleToggleAllWriters,
                  writerSearch
                )}
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-color-2)",
                  marginTop: "4px",
                }}
              >
                {writers.users.length > 0
                  ? `${writers.users.length}명 선택됨`
                  : "선택된 작성자가 없습니다."}
              </p>
            </>
          ) : (
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-color-2)",
              }}
            >
              먼저 멤버를 선택해주세요.
            </p>
          )}
        </div>

        {/* 알림 설정 */}
        <div style={{ marginTop: "24px" }}>
          <h4
            style={{
              marginBottom: "4px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            알림 설정
          </h4>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-color-2)",
              marginBottom: "12px",
            }}
          >
            이 보드에서 발송할 알림 이벤트를 설정합니다.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {(
              Object.keys(NOTIF_LABELS) as Array<
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
                    {NOTIF_LABELS[key].label}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--text-color-2)",
                      marginTop: "2px",
                    }}
                  >
                    {NOTIF_LABELS[key].desc}
                  </div>
                </div>
                <ToggleSwitch
                  checked={notifEvents[key]}
                  onChange={(v) =>
                    setNotifEvents((prev) => ({ ...prev, [key]: v }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* 채팅 설정 */}
        {schoolChatEnabled && (
          <div style={{ marginTop: "24px" }}>
            <h4
              style={{
                marginBottom: "4px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              채팅 설정
            </h4>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-color-2)",
                marginBottom: "12px",
              }}
            >
              이 보드의 채팅 기능을 설정합니다.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500 }}>
                  채팅 활성화
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-color-2)",
                    marginTop: "2px",
                  }}
                >
                  보드 채팅 탭을 활성화합니다
                </div>
              </div>
              <ToggleSwitch
                checked={chatEnabled}
                onChange={(v) => setChatEnabled(v)}
              />
            </div>
          </div>
        )}
      </div>
    </Popup>
  );
};

export default BoardManagePopup;
