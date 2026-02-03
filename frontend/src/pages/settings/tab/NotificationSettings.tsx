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

import { TNotificationSettings } from "types/notification";

type Props = {};

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
    value: boolean
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
                  defaultChecked={settings[item.key]}
                  onChange={(checked: boolean) => {
                    updateSetting(item.key, checked);
                  }}
                />
              </div>
            </div>
            {idx < settingItems.length - 1 && <Divider />}
          </div>
        ))}
      </div>
    </>
  );
};

export default NotificationSettings;
