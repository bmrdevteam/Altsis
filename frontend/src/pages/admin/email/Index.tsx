import { ChangeEvent, useEffect, useState } from "react";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Button from "components/button/Button";
import Input from "components/input/Input";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Loading from "components/loading/Loading";
import {
  TAcademyEmailSmtp,
  TEmailNotifyTypes,
} from "types/academies";
import style from "style/pages/admin/schools.module.scss";

const SUCCESS_MESSAGE = "저장되었습니다.";

const DEFAULT_TYPES: TEmailNotifyTypes = {
  classInvitation: true,
  classCancellation: true,
  classApproval: true,
  classApprovalCancel: true,
  boardInvitation: true,
  altFormApprovalRequest: true,
  altFormApprovalResult: true,
  reminder: true,
};

const TYPE_ITEMS: { key: keyof TEmailNotifyTypes; label: string }[] = [
  { key: "classInvitation", label: "수업 초대" },
  { key: "classCancellation", label: "수업 초대 취소" },
  { key: "classApproval", label: "수업 승인" },
  { key: "classApprovalCancel", label: "수업 승인 취소" },
  { key: "boardInvitation", label: "보드 초대" },
  { key: "altFormApprovalRequest", label: "승인·회람 요청" },
  { key: "altFormApprovalResult", label: "승인 결과" },
  { key: "reminder", label: "리마인더" },
];

const AdminEmail = () => {
  const { currentUser, currentSchool } = useAuth();
  const { AcademyAPI } = useAPIv2();
  const academyId = currentUser?.academyId || "";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTypes, setSavingTypes] = useState(false);
  const [testing, setTesting] = useState(false);
  const [data, setData] = useState<TAcademyEmailSmtp | null>(null);

  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [secure, setSecure] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [from, setFrom] = useState("");
  const [types, setTypes] = useState<TEmailNotifyTypes>(DEFAULT_TYPES);

  const featureEnabled =
    currentSchool?.academyFeatures?.emailNotifyEnabled === true ||
    data?.emailNotifyEnabled === true;

  const load = async () => {
    if (!academyId) return;
    const next = await AcademyAPI.RAcademyEmailSmtp({
      params: { academyId },
    });
    setData(next);
    setPort(String(next.smtp?.port || 587));
    setSecure(next.smtp?.secure === true);
    setTypes({ ...DEFAULT_TYPES, ...next.emailNotifyTypes });
    setHost("");
    setUser("");
    setPass("");
    setFrom("");
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setLoadError(true);
          ALERT_ERROR(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [academyId]);

  const handleSaveSmtp = async () => {
    if (!academyId || saving) return;
    setSaving(true);
    try {
      const next = await AcademyAPI.UAcademyEmailSmtp({
        params: { academyId },
        data: {
          host,
          port: Number(port) || 587,
          secure,
          user,
          pass,
          from,
        },
      });
      setData(next);
      setTypes({ ...DEFAULT_TYPES, ...next.emailNotifyTypes });
      setHost("");
      setUser("");
      setPass("");
      setFrom("");
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setSaving(false);
    }
  };

  const handleClearSmtp = async () => {
    if (!academyId || saving) return;
    if (!window.confirm("저장된 SMTP를 삭제할까요? 이메일 발송이 중단됩니다.")) {
      return;
    }
    setSaving(true);
    try {
      const next = await AcademyAPI.UAcademyEmailSmtp({
        params: { academyId },
        data: { clear: true },
      });
      setData(next);
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTypes = async () => {
    if (!academyId || savingTypes) return;
    setSavingTypes(true);
    try {
      const { emailNotifyTypes } = await AcademyAPI.UAcademyEmailNotifyTypes({
        params: { academyId },
        data: { emailNotifyTypes: types },
      });
      setTypes({ ...DEFAULT_TYPES, ...emailNotifyTypes });
      setData((prev) =>
        prev ? { ...prev, emailNotifyTypes } : prev
      );
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setSavingTypes(false);
    }
  };

  const handleTest = async () => {
    if (!academyId || testing) return;
    setTesting(true);
    try {
      await AcademyAPI.CAcademyEmailSmtpTest({ params: { academyId } });
      alert("테스트 메일을 보냈습니다. 프로필 또는 Google 메일을 확인해 주세요.");
    } catch (err: any) {
      const code = err?.response?.data?.message || err?.message;
      if (code === "EMAIL_NOTIFY_DISABLED") {
        alert("소유자가 이메일 알림을 허용하지 않았습니다.");
      } else if (code === "EMAIL_SMTP_NOT_CONFIGURED") {
        alert("SMTP를 먼저 저장해 주세요.");
      } else if (code === "EMAIL_ADDRESS_MISSING") {
        alert("프로필 또는 Google 메일 주소가 없습니다.");
      } else {
        ALERT_ERROR(err);
      }
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <Loading height={"calc(100vh - 55px)"} />;
  }

  if (loadError || !data) {
    return (
      <div className={style.section}>
        <div className={style.title}>이메일 알림</div>
        <p style={{ color: "var(--accent-3)" }}>
          SMTP 설정을 불러오지 못했습니다. 권한을 확인한 뒤 다시 시도해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className={style.section}>
      <div className={style.title}>이메일 알림</div>
      <p style={{ color: "var(--accent-3)", marginBottom: 24, lineHeight: 1.5 }}>
        아카데미 SMTP로 중요 알림을 메일로 보냅니다. 새 게시글·채팅·일정 시작은
        메일로 보내지 않습니다. 사용자는 설정에서 수신을 켜야 메일을 받습니다.
      </p>

      {!featureEnabled && (
        <p style={{ color: "var(--color-r4, #d9534f)", marginBottom: 16 }}>
          소유자가 아직 이메일 알림을 허용하지 않았습니다. SMTP는 저장할 수
          있지만 발송은 허용 후에만 됩니다.
        </p>
      )}

      <h3 style={{ margin: "0 0 12px" }}>SMTP</h3>
      <p style={{ color: "var(--accent-3)", marginBottom: 16 }}>
        {data.configured
          ? `설정됨 · ${data.smtp.host || "호스트"} / ${data.smtp.user || "계정"}`
          : "아직 설정되지 않았습니다."}
        {data.smtp.from ? ` · 보낸 사람 ${data.smtp.from}` : ""}
        {data.configured
          ? " 비워 둔 항목은 기존 값을 유지합니다."
          : ""}
      </p>

      <div
        style={{
          display: "grid",
          gap: 16,
          maxWidth: 520,
          marginBottom: 16,
        }}
      >
        <Input
          label="호스트"
          appearence="flat"
          placeholder={data.smtp.host || "smtp.example.com"}
          value={host}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setHost(e.target.value)
          }
        />
        <Input
          label="포트"
          appearence="flat"
          type="number"
          value={port}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setPort(e.target.value)
          }
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontWeight: 500 }}>보안 연결 (TLS/SSL)</div>
            <div style={{ color: "var(--accent-3)", fontSize: 13 }}>
              보통 465는 켜고, 587은 끕니다.
            </div>
          </div>
          <ToggleSwitch
            checked={secure}
            onChange={(checked: boolean) => setSecure(checked)}
          />
        </div>
        <Input
          label="계정"
          appearence="flat"
          placeholder={data.smtp.user || "user@example.com"}
          value={user}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setUser(e.target.value)
          }
        />
        <Input
          label="비밀번호"
          appearence="flat"
          type="password"
          placeholder={data.configured ? "변경할 때만 입력" : ""}
          value={pass}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setPass(e.target.value)
          }
        />
        <Input
          label="보낸 사람"
          appearence="flat"
          placeholder={data.smtp.from || "알림 <noreply@example.com>"}
          value={from}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setFrom(e.target.value)
          }
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        <Button
          type="ghost"
          disabled={saving}
          style={{ borderRadius: 4, height: 32 }}
          onClick={handleSaveSmtp}
        >
          {saving ? "저장 중…" : "SMTP 저장"}
        </Button>
        <Button
          type="ghost"
          disabled={saving || !data.configured}
          style={{ borderRadius: 4, height: 32 }}
          onClick={handleClearSmtp}
        >
          SMTP 삭제
        </Button>
        <Button
          type="ghost"
          disabled={testing || !data.configured || !featureEnabled}
          style={{ borderRadius: 4, height: 32 }}
          onClick={handleTest}
        >
          {testing ? "보내는 중…" : "테스트 보내기"}
        </Button>
      </div>

      <h3 style={{ margin: "0 0 12px" }}>메일로 보낼 유형</h3>
      <p style={{ color: "var(--accent-3)", marginBottom: 16 }}>
        끈 유형은 사용자가 알림을 켜 두어도 메일이 가지 않습니다.
      </p>
      <div style={{ display: "grid", gap: 12, maxWidth: 520, marginBottom: 16 }}>
        {TYPE_ITEMS.map((item) => (
          <div
            key={item.key}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <span>{item.label}</span>
            <ToggleSwitch
              checked={types[item.key] !== false}
              onChange={(checked: boolean) =>
                setTypes((prev) => ({ ...prev, [item.key]: checked }))
              }
            />
          </div>
        ))}
      </div>
      <Button
        type="ghost"
        disabled={savingTypes}
        style={{ borderRadius: 4, height: 32 }}
        onClick={handleSaveTypes}
      >
        {savingTypes ? "저장 중…" : "유형 저장"}
      </Button>
    </div>
  );
};

export default AdminEmail;
