/**
 * @file Settings Page tab - NotificationSettings
 *
 * @author
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * - NotificationSettings Page
 *
 * -------------------------------------------------------
 */

import { useEffect, useState } from "react";
import style from "style/pages/settings/settings.module.scss";

// hooks
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useWebPush, isWebPushSupported } from "hooks/useWebPush";

// components
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import Divider from "components/divider/Divider";
import Select from "components/select/Select";

import { TNotificationSettings } from "types/notification";

type Props = {};

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
  eventReminderDefault: 15,
  webPushEnabled: false,
};

const NotificationSettings = (props: Props) => {
  const { NotificationAPI } = useAPIv2();
  const { enableWebPush, disableWebPush } = useWebPush();

  const [settings, setSettings] = useState<TNotificationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [pushBusy, setPushBusy] = useState(false);
  const pushSupported = isWebPushSupported();

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
        alert("브라우저 알림 권한이 거부되었습니다. 사이트 설정에서 허용해 주세요.");
      } else if (code === "WEB_PUSH_UNSUPPORTED" || code === "SERVICE_WORKER_UNSUPPORTED") {
        alert("이 브라우저에서는 잠금화면 알림을 지원하지 않습니다. iOS는 홈 화면에 추가한 뒤 사용해 주세요.");
      } else if (code === "WEB_PUSH_NOT_CONFIGURED") {
        alert("서버에 Web Push가 아직 설정되지 않았습니다.");
      } else {
        ALERT_ERROR(err);
      }
    } finally {
      setPushBusy(false);
    }
  };

  const settingItems: {
    key: keyof TNotificationSettings;
    label: string;
    description: string;
  }[] = [
    {
      key: "soundEnabled",
      label: "알림음",
      description: "앱이 열려 있을 때 알림이 도착하면 소리로 알려줍니다",
    },
    {
      key: "reminder",
      label: "리마인더 알림",
      description: "리마인더 시간이 되면 알림을 보냅니다",
    },
  ];

  return (
    <>
      <div className={style.settings_container}>
        <div className={style.container_title}>알림 설정</div>
        {settingItems.map((item, idx) => (
          <div key={item.key}>
            <div className={style.setting_item}>
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
            {idx < settingItems.length - 1 && <Divider />}
          </div>
        ))}
        <Divider />
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
        <div className={style.setting_item}>
          <div className={style.info}>
            <label className={style.label}>잠금화면 알림 (Web Push)</label>
            <span className={style.description}>
              수업 초대, 승인 요청, 리마인더만 잠금화면에 표시합니다. 기본은
              꺼져 있으며, 허용 시에만 동작합니다.
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
      </div>
    </>
  );
};

export default NotificationSettings;
