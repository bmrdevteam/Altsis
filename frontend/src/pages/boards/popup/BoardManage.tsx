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

import { useState } from "react";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Button from "components/button/Button";
import Textarea from "components/textarea/Textarea";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";

import { TBoard } from "types/board";

type Props = {
  board: TBoard;
  setState: (state: boolean) => void;
  onSuccess?: () => void;
};

const BoardManagePopup = ({ board, setState, onSuccess }: Props) => {
  const { currentSchool } = useAuth();
  const { BoardAPI } = useAPIv2();

  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description || "");
  const [permissionWrite, setPermissionWrite] = useState(
    board.permissionWrite || {
      manager: true,
      teacher: true,
      student: false,
    }
  );
  const [permissionRead, setPermissionRead] = useState(
    board.permissionRead || {
      manager: true,
      teacher: true,
      student: true,
    }
  );
  const [permissionComment, setPermissionComment] = useState(
    board.permissionComment || {
      manager: true,
      teacher: true,
      student: true,
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("알림 이름을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 게시판 기본 정보 수정
      await BoardAPI.UBoard({
        params: { _id: board._id },
        data: {
          name: name.trim(),
          description: description.trim(),
        },
      });

      // 읽기 권한 수정
      await BoardAPI.UBoardPermission({
        params: { _id: board._id, type: "read" },
        data: permissionRead,
      });

      // 쓰기 권한 수정
      await BoardAPI.UBoardPermission({
        params: { _id: board._id, type: "write" },
        data: permissionWrite,
      });

      // 댓글 권한 수정
      await BoardAPI.UBoardPermission({
        params: { _id: board._id, type: "comment" },
        data: permissionComment,
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
      alert("기본 알림은 삭제할 수 없습니다.");
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
      title="알림 관리"
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
          <h4 style={{ marginBottom: "12px", fontSize: "14px", fontWeight: 600 }}>
            기본 정보
          </h4>
          <div style={{ marginBottom: "16px" }}>
            <Input
              label="알림 이름"
              placeholder="알림 이름을 입력하세요"
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
                기본 알림의 이름은 변경할 수 없습니다.
              </p>
            )}
          </div>
          <div>
            <Textarea
              label="설명 (선택)"
              placeholder="알림에 대한 설명을 입력하세요"
              defaultValue={description}
              onChange={(e: any) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* 읽기 권한 */}
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ marginBottom: "12px", fontSize: "14px", fontWeight: 600 }}>
            읽기 권한
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>관리자</span>
              <ToggleSwitch
                defaultChecked={permissionRead.manager}
                onChange={(checked: boolean) =>
                  setPermissionRead({ ...permissionRead, manager: checked })
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
                defaultChecked={permissionRead.teacher}
                onChange={(checked: boolean) =>
                  setPermissionRead({ ...permissionRead, teacher: checked })
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
                defaultChecked={permissionRead.student}
                onChange={(checked: boolean) =>
                  setPermissionRead({ ...permissionRead, student: checked })
                }
              />
            </div>
          </div>
        </div>

        {/* 쓰기 권한 */}
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ marginBottom: "12px", fontSize: "14px", fontWeight: 600 }}>
            쓰기 권한
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>관리자</span>
              <ToggleSwitch
                defaultChecked={permissionWrite.manager}
                onChange={(checked: boolean) =>
                  setPermissionWrite({ ...permissionWrite, manager: checked })
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
                defaultChecked={permissionWrite.teacher}
                onChange={(checked: boolean) =>
                  setPermissionWrite({ ...permissionWrite, teacher: checked })
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
                defaultChecked={permissionWrite.student}
                onChange={(checked: boolean) =>
                  setPermissionWrite({ ...permissionWrite, student: checked })
                }
              />
            </div>
          </div>
        </div>

        {/* 댓글 권한 */}
        <div>
          <h4 style={{ marginBottom: "12px", fontSize: "14px", fontWeight: 600 }}>
            댓글 권한
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>관리자</span>
              <ToggleSwitch
                defaultChecked={permissionComment.manager}
                onChange={(checked: boolean) =>
                  setPermissionComment({ ...permissionComment, manager: checked })
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
                defaultChecked={permissionComment.teacher}
                onChange={(checked: boolean) =>
                  setPermissionComment({ ...permissionComment, teacher: checked })
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
                defaultChecked={permissionComment.student}
                onChange={(checked: boolean) =>
                  setPermissionComment({ ...permissionComment, student: checked })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default BoardManagePopup;
