/**
 * @file Settings Page tab - NotificationSettings
 *
 * 인앱 알림 유형별 ON/OFF와 잠금화면 Web Push(마스터)를 함께 관리한다.
 * 유형 토글 OFF → 인앱·Web Push 모두 차단.
 * 잠금화면 ON → 위에서 허용한 유형이 인앱과 동일하게 잠금화면에도 표시.
 */

import { useEffect, useState } from "react";
import style from "style/pages/settings/settings.module.scss";

import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAuth } from "contexts/authContext";
import { useWebPush, isWebPushSupported } from "hooks/useWebPush";

import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Divider from "components/divider/Divider";
import Select from "components/select/Select";

import { TNotificationSettings } from "types/notification";

const REMINDER_TIME_OPTIONS = [
  { text: "15분 전", value: "15" },
  { text: "30분 전", value: "30" },
  { text: "1시간 전", value: "60" },
  { text: "1일 전", value: "1440" },
];

const DEFAULT_SETTINGS: TNotificationSettings = {
  classInvitation: true,
  classCancellation: true,
  classApproval: true,
  classApprovalCancel: true,
  scheduleStart: true,
  newPost: true,
  chatMessage: true,
  soundEnabled: true,
  reminder: true,
  boardInvitation: true,
  altFormApprovalRequest: true,
  altFormApprovalResult: true,
  eventReminderDefault: 15,
  webPushEnabled: false,
  emailEnabled: false,
};

type SettingItem = {
  key: keyof TNotificationSettings;
  label: string;
  description: string;
};

type SettingGroup = {
  title: string;
  items: SettingItem[];
};

const TYPE_GROUPS: SettingGroup[] = [
  {
    title: "수업",
    items: [
      {
        key: "classInvitation",
        label: "수업 초대",
        description: "수업에 초대되었을 때 알림을 받습니다",
      },
      {
        key: "classCancellation",
        label: "수업 초대 취소",
        description: "수업 초대가 취소되었을 때 알림을 받습니다",
      },
      {
        key: "classApproval",
        label: "수업 승인",
        description: "수업이 승인되었을 때 알림을 받습니다",
      },
      {
        key: "classApprovalCancel",
        label: "수업 승인 취소",
        description: "수업 승인이 취소되었을 때 알림을 받습니다",
      },
    ],
  },
  {
    title: "일정 · 리마인더",
    items: [
      {
        key: "scheduleStart",
        label: "일정 시작",
        description: "캘린더 일정이 시작될 때 알림을 받습니다",
      },
      {
        key: "reminder",
        label: "리마인더",
        description: "리마인더 시간이 되면 알림을 받습니다",
      },
    ],
  },
  {
    title: "보드 · 게시글",
    items: [
      {
        key: "newPost",
        label: "새 게시글",
        description: "보드에 새 게시글이 등록되었을 때 알림을 받습니다",
      },
      {
        key: "boardInvitation",
        label: "보드 초대",
        description: "보드에 초대되었을 때 알림을 받습니다",
      },
    ],
  },
  {
    title: "Alt 폼",
    items: [
      {
        key: "altFormApprovalRequest",
        label: "승인·회람 알림",
        description: "승인 요청·문서 회람 시 알림을 받습니다",
      },
      {
        key: "altFormApprovalResult",
        label: "승인 결과",
        description: "승인·반려 결과가 나왔을 때 알림을 받습니다",
      },
    ],
  },
  {
    title: "채팅",
    items: [
      {
        key: "chatMessage",
        label: "채팅 메시지",
        description:
          "새 채팅 메시지가 오면 잠금화면 알림을 받습니다 (잠금화면 알림 ON 필요)",
      },
    ],
  },
];

const NotificationSettings = () => {
  const { NotificationAPI } = useAPIv2();
  const { currentSchool } = useAuth();
  const { enableWebPush, disableWebPush, sendTestPush } = useWebPush();

  const [settings, setSettings] =
    useState<TNotificationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [pushBusy, setPushBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [emailTestBusy, setEmailTestBusy] = useState(false);
  const pushSupported = isWebPushSupported();
  const emailFeatureEnabled =
    currentSchool?.academyFeatures?.emailNotifyEnabled === true;

  useEffect(() => {
    if (isLoading) {
      NotificationAPI.RNotificationSettings()
        .then(({ settings: next }) => {
          setSettings({ ...DEFAULT_SETTINGS, ...next });
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
    value: boolean | number
  ) => {
    try {
      const newSettings = { ...settings, [key]: value };
      const { settings: saved } = await NotificationAPI.UNotificationSettings({
        data: { [key]: value },
      });
      setSettings({ ...newSettings, ...saved });
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const handleWebPushToggle = async (checked: boolean) => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (checked) {
        await enableWebPush();
        setSettings((prev) => ({ ...prev, webPushEnabled: true }));
      } else {
        await disableWebPush();
        setSettings((prev) => ({ ...prev, webPushEnabled: false }));
      }
    } catch (err: any) {
      const code = err?.message || err?.response?.data?.message;
      if (code === "PERMISSION_DENIED") {
        alert(
          "브라우저 알림 권한이 거부되었습니다. 사이트 설정에서 허용해 주세요."
        );
      } else if (
        code === "WEB_PUSH_UNSUPPORTED" ||
        code === "SERVICE_WORKER_UNSUPPORTED"
      ) {
        alert(
          "이 브라우저에서는 잠금화면 알림을 지원하지 않습니다. iOS는 홈 화면에 추가한 뒤 사용해 주세요."
        );
      } else if (code === "WEB_PUSH_NOT_CONFIGURED") {
        alert(
          "서버에 Web Push가 아직 설정되지 않았습니다. test-backend 배포와 VAPID Secrets를 확인해 주세요."
        );
      } else {
        ALERT_ERROR(err);
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleTestPush = async () => {
    if (testBusy) return;
    setTestBusy(true);
    try {
      await sendTestPush();
      alert(
        "테스트 알림을 보냈습니다. 잠시 후 잠금화면/알림창을 확인해 주세요. 앱을 백그라운드로 두면 확인하기 쉽습니다."
      );
    } catch (err: any) {
      const code = err?.response?.data?.message || err?.message;
      if (code === "WEB_PUSH_NOT_CONFIGURED") {
        alert("서버에 Web Push가 아직 설정되지 않았습니다.");
      } else if (code === "WEB_PUSH_DISABLED") {
        alert("잠금화면 알림을 먼저 켜 주세요.");
      } else if (code === "NO_PUSH_SUBSCRIPTION") {
        alert(
          "이 기기의 푸시 구독이 없습니다. 잠금화면 알림을 껐다가 다시 켜 주세요."
        );
      } else {
        ALERT_ERROR(err);
      }
    } finally {
      setTestBusy(false);
    }
  };

  const handleTestEmail = async () => {
    if (emailTestBusy) return;
    setEmailTestBusy(true);
    try {
      await NotificationAPI.CTestEmail();
      alert(
        "테스트 메일을 보냈습니다. 프로필 또는 Google 메일함을 확인해 주세요."
      );
    } catch (err: any) {
      const code = err?.response?.data?.message || err?.message;
      if (code === "EMAIL_NOTIFY_DISABLED") {
        alert("아카데미에서 이메일 알림이 허용되지 않았습니다.");
      } else if (code === "EMAIL_SMTP_NOT_CONFIGURED") {
        alert("아카데미 관리자가 아직 SMTP를 설정하지 않았습니다.");
      } else if (code === "EMAIL_DISABLED") {
        alert("이메일 알림을 먼저 켜 주세요.");
      } else if (code === "EMAIL_ADDRESS_MISSING") {
        alert(
          "받을 메일 주소가 없습니다. 프로필 이메일을 넣거나 Google로 로그인해 주세요."
        );
      } else {
        ALERT_ERROR(err);
      }
    } finally {
      setEmailTestBusy(false);
    }
  };

  const renderToggleRow = (item: SettingItem) => (
    <div key={item.key} className={style.setting_item}>
      <div className={style.info}>
        <label className={style.label}>{item.label}</label>
        <span className={style.description}>{item.description}</span>
      </div>
      <div className={style.controls}>
        <ToggleSwitch
          key={`${item.key}-${settings[item.key]}`}
          defaultChecked={Boolean(settings[item.key])}
          onChange={(checked: boolean) => {
            updateSetting(item.key, checked);
          }}
        />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className={style.settings_container}>
        <div className={style.container_title}>알림 설정</div>
        <div className={style.description}>불러오는 중…</div>
      </div>
    );
  }

  return (
    <>
      <div className={style.settings_container}>
        <div className={style.container_title}>알림 설정</div>
        <p
          style={{
            fontSize: 13,
            color: "var(--accent-3)",
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          유형별 설정은 앱 안 알림과 잠금화면 알림에 동일하게 적용됩니다.
          잠금화면 알림을 켜면, 아래에서 허용한 유형이 벨 알림과 같이 잠금화면에도
          표시됩니다.
          {emailFeatureEnabled
            ? " 이메일 알림을 켜면, 아카데미가 메일로 보내는 유형만 같은 토글로 받습니다."
            : ""}
        </p>

        <div className={style.container_subtitle}>일반</div>
        {renderToggleRow({
          key: "soundEnabled",
          label: "알림음",
          description: "앱이 열려 있을 때 알림이 도착하면 소리로 알려줍니다",
        })}
        <Divider />

        {TYPE_GROUPS.map((group) => (
          <div key={group.title}>
            <div className={style.container_subtitle}>{group.title}</div>
            {group.items.map((item, idx) => (
              <div key={item.key}>
                {renderToggleRow(item)}
                {idx < group.items.length - 1 && <Divider />}
              </div>
            ))}
            <Divider />
          </div>
        ))}

        <div className={style.container_subtitle}>리마인더 기본값</div>
        <div className={style.setting_item}>
          <div className={style.info}>
            <label className={style.label}>기본 리마인더 시간</label>
            <span className={style.description}>
              캘린더 일정의 기본 리마인더 알림 시간을 설정합니다
            </span>
          </div>
          <div className={`${style.controls} ${style.controls_centered}`}>
            <Select
              options={REMINDER_TIME_OPTIONS}
              defaultSelectedValue={String(settings.eventReminderDefault ?? 15)}
              onChange={(val: string) => {
                updateSetting("eventReminderDefault", parseInt(val, 10));
              }}
              appearence="flat"
            />
          </div>
        </div>
        <Divider />

        <div className={style.container_subtitle}>잠금화면 (Web Push)</div>
        <div className={style.setting_item}>
          <div className={style.info}>
            <label className={style.label}>잠금화면 알림</label>
            <span className={style.description}>
              켠 경우, 위에서 허용한 알림 유형이 앱 안과 동일하게 잠금화면에도
              표시됩니다.
              {!pushSupported &&
                " (이 브라우저는 미지원이거나, iOS는 홈 화면 추가가 필요합니다.)"}
            </span>
          </div>
          <div className={style.controls}>
            <ToggleSwitch
              key={`webPush-${settings.webPushEnabled}`}
              defaultChecked={Boolean(settings.webPushEnabled)}
              disabled={pushBusy || !pushSupported}
              onChange={handleWebPushToggle}
            />
          </div>
        </div>
        {settings.webPushEnabled && pushSupported && (
          <>
            <Divider />
            <div className={style.setting_item}>
              <div className={style.info}>
                <label className={style.label}>테스트 알림</label>
                <span className={style.description}>
                  이 기기로 잠금화면 알림이 오는지 바로 확인할 수 있습니다.
                </span>
              </div>
              <div className={style.controls}>
                <button
                  type="button"
                  disabled={testBusy}
                  aria-busy={testBusy}
                  onClick={handleTestPush}
                  className={style.test_push_button}
                >
                  {testBusy ? "전송 중…" : "테스트 보내기"}
                </button>
              </div>
            </div>
          </>
        )}
        {emailFeatureEnabled && (
          <>
            <Divider />
            <div className={style.container_subtitle}>이메일</div>
            <div className={style.setting_item}>
              <div className={style.info}>
                <label className={style.label}>이메일 알림</label>
                <span className={style.description}>
                  프로필 이메일 또는 Google 메일로 받습니다. 어떤 유형이 메일로
                  가는지는 아카데미 관리자가 정합니다. 위에서 끈 유형은 메일도
                  가지 않습니다.
                </span>
              </div>
              <div className={style.controls}>
                <ToggleSwitch
                  key={`email-${settings.emailEnabled}`}
                  defaultChecked={Boolean(settings.emailEnabled)}
                  onChange={(checked: boolean) => {
                    updateSetting("emailEnabled", checked);
                  }}
                />
              </div>
            </div>
            {settings.emailEnabled && (
              <>
                <Divider />
                <div className={style.setting_item}>
                  <div className={style.info}>
                    <label className={style.label}>테스트 메일</label>
                    <span className={style.description}>
                      내 주소로 테스트 메일이 오는지 바로 확인할 수 있습니다.
                    </span>
                  </div>
                  <div className={style.controls}>
                    <button
                      type="button"
                      disabled={emailTestBusy}
                      aria-busy={emailTestBusy}
                      onClick={handleTestEmail}
                      className={style.test_push_button}
                    >
                      {emailTestBusy ? "전송 중…" : "테스트 보내기"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default NotificationSettings;
