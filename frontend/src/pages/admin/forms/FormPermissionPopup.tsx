import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import Autofill from "components/input/Autofill";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAuth } from "contexts/authContext";
import { useEffect, useState } from "react";

type Props = {
  form: any;
  setState: (v: boolean) => void;
  onUpdate?: () => void;
};

const FormPermissionPopup = ({ form, setState, onUpdate }: Props) => {
  const { FormAPI, UserAPI } = useAPIv2();
  const { currentSchool } = useAuth();

  const [permissionView, setPermissionView] = useState<{
    teacher: boolean;
    student: boolean;
    exceptions: { user: string; userId: string; userName: string; isAllowed: boolean }[];
  }>(
    form.permissionView || {
      teacher: true,
      student: false,
      exceptions: [],
    }
  );

  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    UserAPI.RUsers({ query: { sid: currentSchool?.school } })
      .then(({ users }) => {
        setUsers(users);
      })
      .catch((err) => ALERT_ERROR(err));
  }, []);

  const toggleRole = async (role: "teacher" | "student") => {
    try {
      const newValue = !permissionView[role];
      const { form: updatedForm } = await FormAPI.UFormPermission({
        params: { _id: form._id },
        data: { [role]: newValue },
      });
      setPermissionView(updatedForm.permissionView);
      onUpdate?.();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const addException = async (user: any, isAllowed: boolean) => {
    try {
      const { form: updatedForm } = await FormAPI.CFormPermissionException({
        params: { _id: form._id },
        data: {
          user: user._id,
          userId: user.userId,
          userName: user.userName,
          isAllowed,
        },
      });
      setPermissionView(updatedForm.permissionView);
      onUpdate?.();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const removeException = async (userId: string) => {
    try {
      const { form: updatedForm } = await FormAPI.DFormPermissionException({
        params: { _id: form._id },
        query: { userId },
      });
      setPermissionView(updatedForm.permissionView);
      onUpdate?.();
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const exceptedUserIds = permissionView.exceptions.map((e) => e.userId);
  const availableUsers = users.filter(
    (u) => !exceptedUserIds.includes(u.userId)
  );

  return (
    <Popup
      setState={setState}
      title={`열람 권한 - ${form.title}`}
      closeBtn
      contentScroll
      style={{ maxWidth: "520px", width: "100%" }}
    >
      <div style={{ padding: "16px 0" }}>
        <div style={{ fontWeight: 600, marginBottom: "12px" }}>기본 권한</div>
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <div
            onClick={() => toggleRole("teacher")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: `1px solid ${
                permissionView.teacher ? "var(--accent-1)" : "var(--accent-4)"
              }`,
              backgroundColor: permissionView.teacher
                ? "var(--accent-1)"
                : "transparent",
              color: permissionView.teacher
                ? "var(--background-color)"
                : "var(--text-color)",
              cursor: "pointer",
              userSelect: "none",
              transition: "all 0.2s",
            }}
          >
            교사
          </div>
          <div
            onClick={() => toggleRole("student")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: `1px solid ${
                permissionView.student ? "var(--accent-1)" : "var(--accent-4)"
              }`,
              backgroundColor: permissionView.student
                ? "var(--accent-1)"
                : "transparent",
              color: permissionView.student
                ? "var(--background-color)"
                : "var(--text-color)",
              cursor: "pointer",
              userSelect: "none",
              transition: "all 0.2s",
            }}
          >
            학생
          </div>
        </div>

        <div style={{ fontWeight: 600, marginBottom: "12px" }}>예외 사용자</div>
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "16px",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1 }}>
            <Autofill
              placeholder="사용자 검색"
              style={{ borderRadius: "4px" }}
              options={availableUsers.map((u: any) => ({
                text: `${u.userName} / ${u.userId}`,
                value: JSON.stringify(u),
              }))}
              onChange={(value: string | number) => {
                if (!value || value === "") return;
                const user = JSON.parse(`${value}`);
                addException(user, true);
              }}
              resetOnClick
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {permissionView.exceptions.length === 0 && (
            <div
              style={{
                color: "var(--accent-3)",
                padding: "8px 0",
                fontSize: "14px",
              }}
            >
              예외 사용자가 없습니다.
            </div>
          )}
          {permissionView.exceptions.map((exception) => (
            <div
              key={exception.userId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: "var(--background-color-2)",
              }}
            >
              <span>
                {exception.userName} ({exception.userId})
              </span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span
                  onClick={() => addException(
                    { _id: exception.user, userId: exception.userId, userName: exception.userName },
                    !exception.isAllowed
                  )}
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    cursor: "pointer",
                    backgroundColor: exception.isAllowed
                      ? "var(--green)"
                      : "var(--red)",
                    color: "#fff",
                  }}
                >
                  {exception.isAllowed ? "허용" : "차단"}
                </span>
                <span
                  onClick={() => removeException(exception.userId)}
                  style={{
                    cursor: "pointer",
                    color: "var(--accent-3)",
                    fontSize: "14px",
                  }}
                >
                  삭제
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Popup>
  );
};

export default FormPermissionPopup;
