import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import Input from "components/input/Input";
import Autofill from "components/input/Autofill";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAuth } from "contexts/authContext";
import { objectDownloadAsJson } from "functions/functions";
import useEditorStore from "../store/useEditorStore";

type Props = {
  setState: (v: boolean) => void;
};

const FormSettingsPopup = ({ setState }: Props) => {
  const navigate = useNavigate();
  const { FormAPI, UserAPI } = useAPIv2();
  const { currentSchool } = useAuth();
  const formId = useEditorStore((s) => s.formId);
  const title = useEditorStore((s) => s.title);
  const setTitle = useEditorStore((s) => s.setTitle);
  const formType = useEditorStore((s) => s.formType);

  const [localTitle, setLocalTitle] = useState(title);
  const [activeTab, setActiveTab] = useState<"general" | "permission">("general");
  const [permissionView, setPermissionView] = useState<{
    teacher: boolean;
    student: boolean;
    exceptions: { user: string; userId: string; userName: string; isAllowed: boolean }[];
  }>({
    teacher: true,
    student: false,
    exceptions: [],
  });
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    // Load form permission data
    FormAPI.RForm({ params: { _id: formId } })
      .then(({ form }) => {
        if (form.permissionView) {
          setPermissionView(form.permissionView);
        }
      })
      .catch((err) => ALERT_ERROR(err));

    // Load users for permission exceptions
    if (formType === "print") {
      UserAPI.RUsers({ query: { sid: currentSchool?.school } })
        .then(({ users }) => {
          setUsers(users);
        })
        .catch((err) => ALERT_ERROR(err));
    }
  }, [formId, formType]);

  const handleTitleSave = () => {
    setTitle(localTitle);
  };

  const handleCopy = async () => {
    try {
      await FormAPI.CCopyForm({ params: { _id: formId } });
      alert("복사되었습니다.");
      navigate("/admin/forms");
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleArchive = async () => {
    try {
      await FormAPI.UArchiveForm({ params: { _id: formId } });
      alert("보관되었습니다.");
      navigate("/admin/forms");
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleDownload = async () => {
    try {
      const { form } = await FormAPI.RForm({ params: { _id: formId } });
      objectDownloadAsJson(form);
      alert("다운로드되었습니다.");
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const toggleRole = async (role: "teacher" | "student") => {
    try {
      const newValue = !permissionView[role];
      const { form: updatedForm } = await FormAPI.UFormPermission({
        params: { _id: formId },
        data: { [role]: newValue },
      });
      setPermissionView(updatedForm.permissionView);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const addException = async (user: any, isAllowed: boolean) => {
    try {
      const { form: updatedForm } = await FormAPI.CFormPermissionException({
        params: { _id: formId },
        data: {
          user: user._id,
          userId: user.userId,
          userName: user.userName,
          isAllowed,
        },
      });
      setPermissionView(updatedForm.permissionView);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const removeException = async (userId: string) => {
    try {
      const { form: updatedForm } = await FormAPI.DFormPermissionException({
        params: { _id: formId },
        query: { userId },
      });
      setPermissionView(updatedForm.permissionView);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const exceptedUserIds = permissionView.exceptions.map((e) => e.userId);
  const availableUsers = users.filter((u) => !exceptedUserIds.includes(u.userId));

  return (
    <Popup
      setState={setState}
      title="양식 설정"
      closeBtn
      contentScroll
      style={{ maxWidth: "480px", width: "100%" }}
    >
      <div style={{ padding: "16px 0" }}>
        {/* Tab bar for print forms */}
        {formType === "print" && (
          <div
            style={{
              display: "flex",
              marginBottom: "16px",
              borderRadius: "6px",
              overflow: "hidden",
              backgroundColor: "var(--component-color)",
            }}
          >
            <button
              onClick={() => setActiveTab("general")}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                backgroundColor: activeTab === "general" ? "var(--accent-5)" : "transparent",
                color: activeTab === "general" ? "var(--accent-1)" : "var(--accent-3)",
              }}
            >
              일반
            </button>
            <button
              onClick={() => setActiveTab("permission")}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                backgroundColor: activeTab === "permission" ? "var(--accent-5)" : "transparent",
                color: activeTab === "permission" ? "var(--accent-1)" : "var(--accent-3)",
              }}
            >
              권한
            </button>
          </div>
        )}

        {activeTab === "general" && (
          <>
            {/* Title */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>제목</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Input
                  value={localTitle}
                  onChange={(e: any) => setLocalTitle(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  type="ghost"
                  onClick={handleTitleSave}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "4px",
                    border: "1px solid var(--accent-4)",
                  }}
                >
                  적용
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div style={{ fontWeight: 600, marginBottom: "12px" }}>작업</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Button
                type="ghost"
                onClick={handleCopy}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--accent-4)",
                  justifyContent: "flex-start",
                }}
              >
                복사
              </Button>
              <Button
                type="ghost"
                onClick={handleArchive}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--accent-4)",
                  justifyContent: "flex-start",
                }}
              >
                보관
              </Button>
              <Button
                type="ghost"
                onClick={handleDownload}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--accent-4)",
                  justifyContent: "flex-start",
                }}
              >
                다운로드
              </Button>
            </div>
          </>
        )}

        {activeTab === "permission" && formType === "print" && (
          <>
            <div style={{ fontWeight: 600, marginBottom: "12px" }}>기본 권한</div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
              <div
                onClick={() => toggleRole("teacher")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: `1px solid ${permissionView.teacher ? "var(--accent-1)" : "var(--accent-4)"}`,
                  backgroundColor: permissionView.teacher ? "var(--accent-1)" : "transparent",
                  color: permissionView.teacher ? "var(--background-color)" : "var(--text-color)",
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
                  border: `1px solid ${permissionView.student ? "var(--accent-1)" : "var(--accent-4)"}`,
                  backgroundColor: permissionView.student ? "var(--accent-1)" : "transparent",
                  color: permissionView.student ? "var(--background-color)" : "var(--text-color)",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "all 0.2s",
                }}
              >
                학생
              </div>
            </div>

            <div style={{ fontWeight: 600, marginBottom: "12px" }}>예외 사용자</div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
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
                <div style={{ color: "var(--accent-3)", padding: "8px 0", fontSize: "14px" }}>
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
                      onClick={() =>
                        addException(
                          { _id: exception.user, userId: exception.userId, userName: exception.userName },
                          !exception.isAllowed
                        )
                      }
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        cursor: "pointer",
                        backgroundColor: exception.isAllowed ? "var(--green)" : "var(--red)",
                        color: "#fff",
                      }}
                    >
                      {exception.isAllowed ? "허용" : "차단"}
                    </span>
                    <span
                      onClick={() => removeException(exception.userId)}
                      style={{ cursor: "pointer", color: "var(--accent-3)", fontSize: "14px" }}
                    >
                      삭제
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Popup>
  );
};

export default FormSettingsPopup;
