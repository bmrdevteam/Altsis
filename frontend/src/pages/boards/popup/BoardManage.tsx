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
import { BoardLinkSyllabusPicker } from "./BoardDuplicateFlow";
import { useAppNavigate } from "hooks/useAppNavigate";
import {
  formatMemberIdentity,
  memberMatchesQuery,
} from "../altBoard/memberLabel";

type Props = {
  board: TBoard;
  setState: (state: boolean) => void;
  onSuccess?: () => void;
  onDuplicateRequest?: () => void;
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
  altFormApprovalRequest: { label: "승인·회람 알림", desc: "양식 제출 시 승인자·회람자, 다음 단계 시 승인자에게 알림" },
  altFormApprovalResult: { label: "승인 결과 알림", desc: "단계·최종 승인/반려 시 제출자에게 알림" },
  formDeadlineCalendar: { label: "양식 마감 일정 등록", desc: "양식 마감일을 멤버 캘린더에 등록" },
};

const BoardManagePopup = ({
  board,
  setState,
  onSuccess,
  onDuplicateRequest,
}: Props) => {
  const { currentRegistration, currentSeason, currentSchool } = useAuth();
  const { BoardAPI, RegistrationAPI, UserAPI } = useAPIv2();
  const navigate = useAppNavigate();
  const [showLinkPicker, setShowLinkPicker] = useState(false);

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

    const applyCandidateList = (list: any[]) => {
      setRegistrationList(list);

      // altBoardRole에서 멤버 자동 복원 (기존 보드 마이그레이션)
      if (board.altBoardRole && initialMembers.users.length === 0) {
        const altMembers: { user: string; userId: string; userName: string }[] =
          [];
        const altWriters: { user: string; userId: string; userName: string }[] =
          [];
        for (const [userOid, role] of Object.entries(board.altBoardRole)) {
          const reg = list.find(
            (r: any) => r.user === userOid || r._id === userOid
          );
          if (reg) {
            altMembers.push({
              user: reg.user || reg._id,
              userId: reg.userId,
              userName: reg.userName,
            });
            if (role === "admin" || role === "writer") {
              altWriters.push({
                user: reg.user || reg._id,
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
    };

    if (seasonId) {
      RegistrationAPI.RRegistrations({
        query: { season: seasonId },
      })
        .then(({ registrations }) => {
          applyCandidateList(_.uniqBy(registrations, "userId"));
        })
        .catch(() => {});
    } else if (currentSchool?._id) {
      // 시즌 없음: 학교 소속 사용자를 초대 후보로 (규칙 A)
      UserAPI.RUsers({ query: { sid: currentSchool._id } })
        .then(({ users }) => {
          const list = _.uniqBy(
            users.map((u: any) => ({
              user: u._id,
              userId: u.userId,
              userName: u.userName,
              role: u.auth === "manager" ? "manager" : undefined,
            })),
            "userId"
          );
          applyCandidateList(list);
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

  const attachRegistrationIdentity = (users: TMemberUser[]): TMemberUser[] => {
    if (registrationList.length === 0) return users;
    const byId = new Map(
      registrationList.map((r: { userId: string }) => [r.userId, r])
    );
    return users.map((u) => {
      const reg = byId.get(u.userId) as
        | { role?: string; grade?: string; group?: string }
        | undefined;
      if (!reg) return u;
      return {
        ...u,
        role:
          u.role ||
          (reg.role === "teacher" || reg.role === "student"
            ? reg.role
            : undefined),
        grade: u.grade || reg.grade,
        group: u.group || reg.group,
      };
    });
  };

  /** 체크박스 리스트 렌더링 */
  const renderCheckboxList = (
    items: {
      user: string;
      userId: string;
      userName: string;
      role?: string;
      grade?: string;
      group?: string;
    }[],
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
      (u) => !searchTerm || memberMatchesQuery(u, searchTerm)
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
      role?: string;
      grade?: string;
      group?: string;
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
          {formatMemberIdentity(u)}
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
    const others = filtered.filter(
      (u) => u.role !== "teacher" && u.role !== "student"
    );

    // 시즌 없이 학교 소속만 불러온 경우 role이 없을 수 있음 → 전체 목록으로 표시
    if (teachers.length === 0 && students.length === 0 && others.length > 0) {
      return (
        <>
          {renderGroupHeader("학교 소속", others)}
          {others.map(renderRow)}
        </>
      );
    }

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
        {others.length > 0 && (
          <>
            {renderGroupHeader("기타", others, {
              borderTop:
                teachers.length > 0 || students.length > 0
                  ? "1px solid var(--border-color)"
                  : undefined,
            })}
            {others.map(renderRow)}
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
        {/* 보드 복제 */}
        {onDuplicateRequest && (
          <div
            style={{
              marginBottom: "24px",
              padding: "14px 16px",
              borderRadius: 8,
              border: "1px solid var(--border-color)",
              background: "var(--bg-color-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                보드 복제
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-color-2)",
                  lineHeight: 1.5,
                }}
              >
                양식·문서만 담은 새 보드를 만듭니다. 다른 쿼터 수업에도 연결할
                수 있습니다.
              </div>
            </div>
            <Button
              type="ghost"
              onClick={onDuplicateRequest}
              disabled={isSubmitting || isDeleting}
              style={{ flexShrink: 0 }}
            >
              복제하기
            </Button>
          </div>
        )}

        {/* 수업 연결 */}
        <div style={{ marginBottom: "24px" }}>
          <h4
            style={{
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            수업 연결
          </h4>
          {board.syllabus || board.syllabusMeta ? (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-color-2)",
                lineHeight: 1.5,
              }}
            >
              「{board.syllabusMeta?.classTitle || board.name}」 수업에 연결되어
              있습니다.
              {board.syllabusMeta?.coursePath && (
                <>
                  {" "}
                  <button
                    type="button"
                    className={bStyle.textBtn}
                    onClick={() => {
                      setState(false);
                      navigate(`${board.syllabusMeta!.coursePath}#활동`);
                    }}
                  >
                    수업에서 열기
                  </button>
                </>
              )}
            </p>
          ) : showLinkPicker ? (
            <BoardLinkSyllabusPicker
              boardId={board._id}
              onCancel={() => setShowLinkPicker(false)}
              onLinked={(_b, syllabus) => {
                alert(`「${syllabus.classTitle}」 수업에 연결되었습니다.`);
                setState(false);
                onSuccess?.();
                navigate(`/courses/mentoring/${syllabus._id}#활동`);
              }}
            />
          ) : (
            <div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-color-2)",
                  marginBottom: 8,
                  lineHeight: 1.5,
                }}
              >
                아직 수업에 연결되지 않았습니다. 보드가 없는 담당 수업에 연결할
                수 있습니다.
              </p>
              <Button type="ghost" onClick={() => setShowLinkPicker(true)}>
                수업에 연결
              </Button>
            </div>
          )}
        </div>

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
            placeholder="이름·아이디·역할·학년·그룹 검색"
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
                placeholder="이름·아이디·역할·학년·그룹 검색"
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
                  attachRegistrationIdentity(members.users),
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
