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
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Autofill from "components/input/Autofill";
import CourseCoverImageEditor from "pages/courses/view/CourseCoverImageEditor";

import {
  TBoard,
  TBoardContentViewMode,
  TBoardMembers,
  TMemberUser,
} from "types/board";

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

const BoardManagePopup = ({ board, setState, onSuccess }: Props) => {
  const { currentUser, currentSchool } = useAuth();
  const { BoardAPI, UserAPI } = useAPIv2();

  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description || "");
  const [contentViewMode, setContentViewMode] =
    useState<TBoardContentViewMode>(board.contentViewMode || "table");

  // 새 멤버/작성자 구조
  const initialMembers = resolveMembers(board);
  const initialWriters = resolveWriters(board);
  const [members, setMembers] = useState<TBoardMembers>(initialMembers);
  const [writers, setWriters] = useState<TBoardMembers>(initialWriters);

  const [coverColor, setCoverColor] = useState(board.coverColor || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 사용자 목록 (개별 초대용)
  const [userList, setUserList] = useState<any[]>([]);

  const coverFileRef = useRef<File | null>(null);
  const coverUrlRef = useRef<string>("");
  const [coverRemoved, setCoverRemoved] = useState(false);

  useEffect(() => {
    if (currentSchool) {
      UserAPI.RUsers({ query: { sid: currentSchool._id } })
        .then(({ users }) => setUserList(users))
        .catch(() => {});
    }
  }, []);

  /** 멤버 그룹 토글 시 작성자 그룹도 연동 (멤버에서 해제된 그룹은 작성자에서도 해제) */
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

  /** 개별 멤버 추가 */
  const handleAddMemberUser = (userJson: string) => {
    const parsed: TMemberUser = JSON.parse(userJson);
    setMembers((prev) => ({
      ...prev,
      users: _.uniqBy([...prev.users, parsed], (u) => u.userId),
    }));
  };

  /** 개별 멤버 제거 */
  const handleRemoveMemberUser = (userId: string) => {
    setMembers((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.userId !== userId),
    }));
    // 멤버에서 제거되면 작성자에서도 제거
    setWriters((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.userId !== userId),
    }));
  };

  /** 개별 작성자 추가 */
  const handleAddWriterUser = (userJson: string) => {
    const parsed: TMemberUser = JSON.parse(userJson);
    setWriters((prev) => ({
      ...prev,
      users: _.uniqBy([...prev.users, parsed], (u) => u.userId),
    }));
  };

  /** 개별 작성자 제거 */
  const handleRemoveWriterUser = (userId: string) => {
    setWriters((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.userId !== userId),
    }));
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
          contentViewMode,
          coverColor: coverColor || undefined,
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

      // 3. 멤버 그룹 업데이트
      await BoardAPI.UBoardMembers({
        params: { _id: board._id },
        data: { groups: members.groups },
      });

      // 4. 작성자 그룹 업데이트
      await BoardAPI.UBoardWriters({
        params: { _id: board._id },
        data: { groups: writers.groups },
      });

      // 5. 개별 멤버 동기화
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

      // 6. 개별 작성자 동기화
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

  /** 개별 사용자 목록에서 이미 추가된 사용자를 제외한 옵션 생성 */
  const getMemberUserOptions = () => {
    const existingIds = new Set(members.users.map((u) => u.userId));
    return userList
      .filter((u: any) => !existingIds.has(u.userId))
      .map((u: any) => ({
        text: `${u.userName}(${u.userId})`,
        value: JSON.stringify({
          user: u._id,
          userId: u.userId,
          userName: u.userName,
        }),
      }));
  };

  const getWriterUserOptions = () => {
    const existingIds = new Set(writers.users.map((u) => u.userId));
    // 작성자는 멤버 중에서만 선택 가능 (개별 멤버 + 그룹 멤버)
    return userList
      .filter((u: any) => !existingIds.has(u.userId))
      .map((u: any) => ({
        text: `${u.userName}(${u.userId})`,
        value: JSON.stringify({
          user: u._id,
          userId: u.userId,
          userName: u.userName,
        }),
      }));
  };

  const renderUserList = (
    users: TMemberUser[],
    onRemove: (userId: string) => void
  ) => {
    if (users.length === 0) return null;
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginTop: "8px",
        }}
      >
        {users.map((u) => (
          <div
            key={u.userId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              backgroundColor: "var(--component-color)",
              borderRadius: "16px",
              fontSize: "13px",
            }}
          >
            <span>
              {u.userName}({u.userId})
            </span>
            <button
              onClick={() => onRemove(u.userId)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0",
                fontSize: "14px",
                color: "var(--text-color-2)",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
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
            <Textarea
              label="설명 (선택)"
              placeholder="보드에 대한 설명을 입력하세요"
              defaultValue={description}
              onChange={(e: any) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "6px",
              }}
            >
              콘텐츠 뷰 모드
            </label>
            <select
              value={contentViewMode}
              onChange={(e) =>
                setContentViewMode(e.target.value as TBoardContentViewMode)
              }
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "var(--background-color-1)",
                color: "var(--accent-1)",
                cursor: "pointer",
              }}
            >
              <option value="table">테이블</option>
              <option value="gallery">갤러리</option>
              <option value="blog">블로그</option>
            </select>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-color-2)",
                marginTop: "4px",
              }}
            >
              보드 내 게시글이 표시되는 방식입니다.
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
              marginBottom: "12px",
            }}
          >
            이 보드에 접근할 수 있는 사람을 설정합니다.
          </p>

          {/* 역할 그룹 토글 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>관리자</span>
              <ToggleSwitch
                defaultChecked={members.groups.manager}
                onChange={(checked: boolean) =>
                  handleMemberGroupChange("manager", checked)
                }
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>교사</span>
              <ToggleSwitch
                defaultChecked={members.groups.teacher}
                onChange={(checked: boolean) =>
                  handleMemberGroupChange("teacher", checked)
                }
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>학생</span>
              <ToggleSwitch
                defaultChecked={members.groups.student}
                onChange={(checked: boolean) =>
                  handleMemberGroupChange("student", checked)
                }
              />
            </div>
          </div>

          {/* 개별 사용자 초대 */}
          <div style={{ marginTop: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                marginBottom: "6px",
              }}
            >
              개별 사용자 초대
            </label>
            <Autofill
              appearence="flat"
              placeholder="이름 또는 아이디로 검색"
              options={getMemberUserOptions()}
              setState={(val: string) => handleAddMemberUser(val)}
              resetOnClick
            />
            {renderUserList(members.users, handleRemoveMemberUser)}
          </div>
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
              marginBottom: "12px",
            }}
          >
            이 보드에 게시글을 작성할 수 있는 사람을 설정합니다.
          </p>

          {/* 역할 그룹 토글 (멤버에서 활성화된 그룹만 표시) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {members.groups.manager && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>관리자</span>
                <ToggleSwitch
                  defaultChecked={writers.groups.manager}
                  onChange={(checked: boolean) =>
                    setWriters((prev) => ({
                      ...prev,
                      groups: { ...prev.groups, manager: checked },
                    }))
                  }
                />
              </div>
            )}
            {members.groups.teacher && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>교사</span>
                <ToggleSwitch
                  defaultChecked={writers.groups.teacher}
                  onChange={(checked: boolean) =>
                    setWriters((prev) => ({
                      ...prev,
                      groups: { ...prev.groups, teacher: checked },
                    }))
                  }
                />
              </div>
            )}
            {members.groups.student && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>학생</span>
                <ToggleSwitch
                  defaultChecked={writers.groups.student}
                  onChange={(checked: boolean) =>
                    setWriters((prev) => ({
                      ...prev,
                      groups: { ...prev.groups, student: checked },
                    }))
                  }
                />
              </div>
            )}
            {!members.groups.manager &&
              !members.groups.teacher &&
              !members.groups.student && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-color-2)",
                  }}
                >
                  멤버에 활성화된 역할 그룹이 없습니다.
                </p>
              )}
          </div>

          {/* 개별 작성자 추가 */}
          <div style={{ marginTop: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                marginBottom: "6px",
              }}
            >
              개별 작성자 추가
            </label>
            <Autofill
              appearence="flat"
              placeholder="이름 또는 아이디로 검색"
              options={getWriterUserOptions()}
              setState={(val: string) => handleAddWriterUser(val)}
              resetOnClick
            />
            {renderUserList(writers.users, handleRemoveWriterUser)}
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default BoardManagePopup;
