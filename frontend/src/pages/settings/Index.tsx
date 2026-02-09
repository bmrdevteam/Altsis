import { useState } from "react";
import Svg from "assets/svg/Svg";
import style from "style/pages/settings/settings.module.scss";

import UserSettings from "./tab/UserSettings";
import SocialLoginSettings from "./tab/SocialLoginSettings";
import SecuritySettings from "./tab/SecuritySettings";
import NotificationSettings from "./tab/NotificationSettings";
import SchoolSettings from "./tab/SchoolSettings";
import ThemeSettings from "./tab/ThemeSettings";

const sections = [
  { key: "user", label: "사용자 정보", icon: "profile" },
  { key: "social", label: "소셜 로그인", icon: "google" },
  { key: "security", label: "보안", icon: "gear" },
  { key: "notification", label: "알림", icon: "notification" },
  { key: "school", label: "등록된 학교", icon: "school" },
  { key: "theme", label: "테마", icon: "grid" },
] as const;

const sectionComponents: Record<string, JSX.Element> = {
  user: <UserSettings />,
  social: <SocialLoginSettings />,
  security: <SecuritySettings />,
  notification: <NotificationSettings />,
  school: <SchoolSettings />,
  theme: <ThemeSettings />,
};

const Settings = () => {
  const [activeSection, setActiveSection] = useState<string>("user");

  return (
    <div className={style.settings_page}>
      <aside className={style.settings_sidebar}>
        <div className={style.sidebar_header}>
          <span className={style.sidebar_title}>설정</span>
        </div>
        <nav className={style.sidebar_nav}>
          {sections.map((section) => (
            <button
              key={section.key}
              className={`${style.sidebar_item} ${
                activeSection === section.key ? style.sidebar_item_active : ""
              }`}
              onClick={() => setActiveSection(section.key)}
              type="button"
            >
              <span className={style.sidebar_icon}>
                <Svg type={section.icon} width="18px" height="18px" />
              </span>
              <span className={style.sidebar_label}>{section.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className={style.settings_content}>
        {sectionComponents[activeSection]}
      </main>
    </div>
  );
};

export default Settings;
