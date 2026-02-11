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

const NotificationSettings = (props: Props) => {
  const { NotificationAPI } = useAPIv2();

  const [settings, setSettings] = useState<TNotificationSettings>({
    classInvitation: true,
    classCancellation: true,
    classApproval: true,
    classApprovalCancel: true,
    scheduleStart: true,
    newPost: true,
    directMessage: true,
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
    value: boolean | number
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

  const settingItems: { key: keyof TNotificationSettings; label: string; description: string }[] = [
    {
      key: "soundEnabled",
      label: "알림음",
      description: "알림이 도착했을 때 소리로 알려줍니다",
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
                  defaultChecked={settings[item.key] as boolean}
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
                updateSetting("eventReminderDefault", parseInt(val));
              }}
              appearence="flat"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationSettings;
