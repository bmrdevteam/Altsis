import { ReactNode, useState } from "react";
import Svg from "assets/svg/Svg";
import { useAppNavigate } from "hooks/useAppNavigate";
import { useAppInstall } from "hooks/useAppInstall";
import {
  AppPlatform,
  appBrowserLabel,
  appPlatformLabel,
} from "utils/appInstallContext";
import style from "./app.module.scss";

type GuideKey = "ios" | "android" | "desktop";

const PLATFORM_META: Record<
  GuideKey,
  { icon: string; title: string; otherLabel: string; otherHint: string }
> = {
  ios: {
    icon: "tablet",
    title: "iPhone / iPad",
    otherLabel: "iPhone / iPad",
    otherHint: "Safari에서 홈 화면에 추가",
  },
  android: {
    icon: "phone",
    title: "Android",
    otherLabel: "Android",
    otherHint: "메뉴에서 앱 설치",
  },
  desktop: {
    icon: "laptop",
    title: "컴퓨터",
    otherLabel: "컴퓨터",
    otherHint: "Chrome · Edge에서 앱으로 설치",
  },
};

function IconWrap({ type }: { type: string }) {
  return (
    <span className={style.icon_wrap} aria-hidden>
      <Svg type={type} width="22px" height="22px" />
    </span>
  );
}

function Steps({
  items,
}: {
  items: { icon: string; text: ReactNode }[];
}) {
  return (
    <ol className={style.steps}>
      {items.map((item, index) => (
        <li key={index}>
          <span className={style.step_num}>{index + 1}</span>
          <span className={style.step_icon} aria-hidden>
            <Svg type={item.icon} width="20px" height="20px" />
          </span>
          <span>{item.text}</span>
        </li>
      ))}
    </ol>
  );
}

function GuideHeading({
  guideKey,
  current,
}: {
  guideKey: GuideKey;
  current?: boolean;
}) {
  const meta = PLATFORM_META[guideKey];
  return (
    <div className={style.card_head}>
      <IconWrap type={meta.icon} />
      <div>
        <h2>{meta.title}</h2>
        {current && <span className={style.chip}>지금 이 기기</span>}
      </div>
    </div>
  );
}

function IosGuide({
  needsSafari,
  current,
  showHeading,
}: {
  needsSafari: boolean;
  current?: boolean;
  showHeading?: boolean;
}) {
  return (
    <>
      {showHeading && <GuideHeading guideKey="ios" current={current} />}
      {needsSafari ? (
        <p className={style.card_text}>
          홈 화면 추가는 Safari에서만 됩니다. Safari로 이 사이트를 연 뒤 공유
          버튼을 눌러 「홈 화면에 추가」를 선택하세요.
        </p>
      ) : (
        <Steps
          items={[
            {
              icon: "shareIos",
              text: "하단(또는 상단)의 공유 버튼을 누릅니다.",
            },
            {
              icon: "addToHome",
              text: (
                <>
                  목록에서 <strong>홈 화면에 추가</strong>를 선택합니다.
                </>
              ),
            },
            {
              icon: "home",
              text: "추가를 누르면 홈 화면에 Altsis 아이콘이 생깁니다.",
            },
          ]}
        />
      )}
    </>
  );
}

function AndroidGuide({
  canPrompt,
  busy,
  onInstall,
  current,
  showHeading,
}: {
  canPrompt: boolean;
  busy: boolean;
  onInstall: () => void;
  current?: boolean;
  showHeading?: boolean;
}) {
  return (
    <>
      {showHeading && <GuideHeading guideKey="android" current={current} />}
      {canPrompt ? (
        <>
          <p className={style.card_text}>
            버튼을 누르면 홈 화면에 앱으로 설치할 수 있습니다.
          </p>
          <div className={style.actions}>
            <button
              type="button"
              className={style.button}
              disabled={busy}
              onClick={onInstall}
            >
              <Svg type="addToHome" width="18px" height="18px" />
              {busy ? "설치 창을 여는 중…" : "홈 화면에 설치"}
            </button>
          </div>
        </>
      ) : (
        <Steps
          items={[
            { icon: "menu", text: "브라우저 메뉴(⋮)를 엽니다." },
            {
              icon: "addToHome",
              text: (
                <>
                  <strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를
                  선택합니다.
                </>
              ),
            },
          ]}
        />
      )}
    </>
  );
}

function DesktopGuide({
  canPrompt,
  busy,
  onInstall,
  current,
  showHeading,
}: {
  canPrompt: boolean;
  busy: boolean;
  onInstall: () => void;
  current?: boolean;
  showHeading?: boolean;
}) {
  return (
    <>
      {showHeading && <GuideHeading guideKey="desktop" current={current} />}
      {canPrompt ? (
        <>
          <p className={style.card_text}>
            Chrome 또는 Edge에서 시작 메뉴·Dock에 앱으로 설치할 수 있습니다.
          </p>
          <div className={style.actions}>
            <button
              type="button"
              className={style.button}
              disabled={busy}
              onClick={onInstall}
            >
              <Svg type="download" width="18px" height="18px" />
              {busy ? "설치 창을 여는 중…" : "앱으로 설치"}
            </button>
          </div>
        </>
      ) : (
        <Steps
          items={[
            {
              icon: "download",
              text: "Chrome 또는 Edge 주소창 오른쪽의 설치 아이콘을 누르거나,",
            },
            {
              icon: "menu",
              text: (
                <>
                  메뉴에서 <strong>앱 설치</strong> / <strong>앱으로 설치</strong>
                  를 선택합니다.
                </>
              ),
            },
            {
              icon: "home",
              text: "Safari는 「파일」 또는 공유 메뉴에서 Dock/홈에 추가할 수 있습니다.",
            },
          ]}
        />
      )}
    </>
  );
}

function guideFor(
  key: GuideKey,
  props: {
    iosNeedsSafari: boolean;
    canPrompt: boolean;
    busy: boolean;
    onInstall: () => void;
    current?: boolean;
    showHeading?: boolean;
  }
) {
  if (key === "ios") {
    return (
      <IosGuide
        needsSafari={props.iosNeedsSafari}
        current={props.current}
        showHeading={props.showHeading}
      />
    );
  }
  if (key === "android") {
    return (
      <AndroidGuide
        canPrompt={props.canPrompt}
        busy={props.busy}
        onInstall={props.onInstall}
        current={props.current}
        showHeading={props.showHeading}
      />
    );
  }
  return (
    <DesktopGuide
      canPrompt={props.canPrompt}
      busy={props.busy}
      onInstall={props.onInstall}
      current={props.current}
      showHeading={props.showHeading}
    />
  );
}

function primaryGuideKey(platform: AppPlatform): GuideKey {
  if (platform === "ios") return "ios";
  if (platform === "android") return "android";
  return "desktop";
}

const AppInstallPage = () => {
  const navigate = useAppNavigate();
  const install = useAppInstall();
  const [busy, setBusy] = useState(false);

  const primary = primaryGuideKey(install.platform);
  const others = (["ios", "android", "desktop"] as GuideKey[]).filter(
    (key) => key !== primary
  );

  const onInstall = async () => {
    setBusy(true);
    try {
      await install.promptInstall();
    } finally {
      setBusy(false);
    }
  };

  const guideProps = {
    iosNeedsSafari: install.iosNeedsSafari,
    canPrompt: install.canPromptInstall,
    busy,
    onInstall,
  };

  return (
    <div className={style.page}>
      <h1 className={style.title}>앱 설치</h1>
      <p className={style.status} aria-live="polite">
        <span className={style.status_device}>
          <Svg
            type={PLATFORM_META[primary].icon}
            width="18px"
            height="18px"
          />
          {appPlatformLabel(install.platform)} · {appBrowserLabel(install.browser)}
        </span>
        <span
          className={`${style.badge} ${install.installed ? style.badge_ok : ""}`}
        >
          {install.installed && (
            <Svg type="checkCircle" width="14px" height="14px" />
          )}
          {install.installed ? "설치됨" : "미설치"}
        </span>
      </p>

      {install.installed ? (
        <section className={style.card}>
          <div className={style.card_head}>
            <IconWrap type="checkCircle" />
            <h2>이미 설치되어 있습니다</h2>
          </div>
          <p className={style.card_text}>
            홈 화면 아이콘으로 열린 상태입니다. 잠금화면 알림은 설정에서 켤 수
            있습니다.
          </p>
        </section>
      ) : (
        <>
          <section className={style.card}>
            {guideFor(primary, { ...guideProps, current: true, showHeading: true })}
          </section>
          {others.map((key) => {
            const meta = PLATFORM_META[key];
            return (
              <details key={key} className={style.other}>
                <summary>
                  <IconWrap type={meta.icon} />
                  <span className={style.other_label}>
                    {meta.otherLabel}
                    <span className={style.other_hint}>{meta.otherHint}</span>
                  </span>
                  <span className={style.chevron} aria-hidden>
                    <Svg type="chevronRight" width="18px" height="18px" />
                  </span>
                </summary>
                <div className={style.other_body}>
                  {guideFor(key, { ...guideProps, showHeading: false })}
                </div>
              </details>
            );
          })}
        </>
      )}

      <section className={style.card}>
        <div className={style.card_head}>
          <IconWrap type="notification" />
          <h2>잠금화면 알림</h2>
        </div>
        {install.platform === "ios" && !install.installed ? (
          <p className={style.card_text}>
            iPhone / iPad는 홈 화면에 추가한 뒤, 그 아이콘으로 열고 설정 →
            알림에서 「잠금화면 알림」을 켜야 합니다.
          </p>
        ) : (
          <p className={style.card_text}>
            유형별 수신과 잠금화면 알림은 설정 → 알림에서 켭니다. 이
            화면에서는 안내만 하고, 스위치는 설정에 있습니다.
          </p>
        )}
        <div className={style.actions}>
          <button
            type="button"
            className={`${style.button} ${style.button_ghost}`}
            onClick={() => navigate("/settings?tab=notification")}
          >
            <Svg type="notification" width="18px" height="18px" />
            설정에서 알림 켜기
          </button>
        </div>
      </section>
    </div>
  );
};

export default AppInstallPage;
