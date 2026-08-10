/**
 * @file School Admin - Notification Settings Tab
 *
 * @author
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 */

import { useEffect, useState } from "react";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";

import { TNotificationSettings } from "types/notification";

// 알림 설정 항목을 카테고리별로 정의
type NotificationSettingItem = {
  key: keyof TNotificationSettings;
  label: string;
  description: string;
};

type NotificationSettingGroup = {
  category: string;
  items: NotificationSettingItem[];
};

const notificationSettingGroups: NotificationSettingGroup[] = [
  {
    category: "일반",
    items: [
      {
        key: "soundEnabled",
        label: "알림음",
        description: "알림이 도착했을 때 소리로 알려줍니다",
      },
    ],
  },
  {
    category: "수업",
    items: [
      {
        key: "classInvitation",
        label: "수업 초대 알림",
        description: "수업에 초대되었을 때 알림을 받습니다",
      },
      {
        key: "classCancellation",
        label: "수업 초대 취소 알림",
        description: "수업 초대가 취소되었을 때 알림을 받습니다",
      },
      {
        key: "classApproval",
        label: "수업 승인 알림",
        description: "수업이 승인되었을 때 알림을 받습니다",
      },
      {
        key: "classApprovalCancel",
        label: "수업 승인 취소 알림",
        description: "수업 승인이 취소되었을 때 알림을 받습니다",
      },
    ],
  },
  {
    category: "일정 및 게시글",
    items: [
      {
        key: "scheduleStart",
        label: "일정 시작 알림",
        description: "일정이 시작될 때 알림을 받습니다",
      },
      {
        key: "reminder",
        label: "리마인더 알림",
        description: "리마인더 시간이 되면 알림을 받습니다",
      },
      {
        key: "newPost",
        label: "새 게시글 알림",
        description: "새 게시글이 등록되었을 때 알림을 받습니다",
      },
      {
        key: "boardInvitation",
        label: "보드 초대 알림",
        description: "보드에 초대되었을 때 알림을 받습니다",
      },
    ],
  },
  {
    category: "Alt 폼",
    items: [
      {
        key: "altFormApprovalRequest",
        label: "승인 요청 알림",
        description: "승인이 필요할 때 알림을 받습니다",
      },
      {
        key: "altFormApprovalResult",
        label: "승인 결과 알림",
        description: "승인·반려 결과가 나왔을 때 알림을 받습니다",
      },
    ],
  },
];

const Notifications = () => {
  const { NotificationAPI } = useAPIv2();

  const [settings, setSettings] = useState<TNotificationSettings>({
    classInvitation: true,
    classCancellation: true,
    classApproval: true,
    classApprovalCancel: true,
    scheduleStart: true,
    newPost: true,
    chatMessage: true,
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

  const cellStyle: React.CSSProperties = {
    padding: "12px 16px",
    textAlign: "left",
    borderBottom: "1px solid var(--border-color)",
  };

  const groupContainerStyle: React.CSSProperties = {
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    overflow: "hidden",
  };

  const groupHeaderStyle: React.CSSProperties = {
    padding: "12px 16px",
    fontWeight: 600,
    fontSize: "13px",
    color: "var(--accent-2)",
    backgroundColor: "var(--component-color)",
    borderBottom: "1px solid var(--border-color)",
  };

  if (isLoading) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "var(--accent-4)" }}>
        로딩 중...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "24px" }}>
      {notificationSettingGroups.map((group) => (
        <div key={group.category} style={groupContainerStyle}>
          <div style={groupHeaderStyle}>{group.category}</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {group.items.map((item, itemIndex) => (
                <tr key={item.key}>
                  <td
                    style={{
                      ...cellStyle,
                      borderBottom:
                        itemIndex < group.items.length - 1
                          ? "1px solid var(--border-color)"
                          : "none",
                    }}
                  >
                    <div style={{ fontSize: "14px", fontWeight: 500 }}>
                      {item.label}
                    </div>
                  </td>
                  <td
                    style={{
                      ...cellStyle,
                      width: "80px",
                      textAlign: "center",
                      borderBottom:
                        itemIndex < group.items.length - 1
                          ? "1px solid var(--border-color)"
                          : "none",
                    }}
                  >
                    <ToggleSwitch
                      checked={!!settings[item.key]}
                      onChange={(checked: boolean) => {
                        updateSetting(item.key, checked);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default Notifications;
