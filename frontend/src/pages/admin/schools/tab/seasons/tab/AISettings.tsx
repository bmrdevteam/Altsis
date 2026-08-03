/**
 * @file School Page Tab Item - Season AI Settings (학기 on/off만)
 */
import { useEffect, useState } from "react";
import Button from "components/button/Button";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TAiSettings } from "types/seasons";
import style from "./AISettings.module.scss";

const SUCCESS_MESSAGE = "저장되었습니다.";

type Props = {
  _id: string;
};

const defaultAiSettings: TAiSettings = {
  enabled: false,
  permission: { teacher: false, student: false },
  guidelines: "",
  references: [],
  examples: {},
  exampleSyllabusIds: [],
};

const AISettings = (props: Props) => {
  const { SeasonAPI } = useAPIv2();
  const [isLoading, setIsLoading] = useState(true);
  const [aiSettings, setAiSettings] = useState<TAiSettings>(defaultAiSettings);

  useEffect(() => {
    if (!isLoading) return;
    let cancelled = false;

    (async () => {
      try {
        const { season } = await SeasonAPI.RSeason({
          params: { _id: props._id },
        });
        if (cancelled) return;
        if (season?.aiSettings) {
          setAiSettings({
            ...defaultAiSettings,
            ...season.aiSettings,
          });
        }
      } catch (err) {
        if (!cancelled) ALERT_ERROR(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, props._id]);

  const handleToggleEnabled = async () => {
    try {
      const next = !aiSettings.enabled;
      const { season } = await SeasonAPI.USeasonAiSettings({
        params: { _id: props._id },
        data: { enabled: next },
      });
      if (season?.aiSettings) {
        setAiSettings({
          ...defaultAiSettings,
          ...season.aiSettings,
        });
      } else {
        setAiSettings((prev) => ({ ...prev, enabled: next }));
      }
      alert(SUCCESS_MESSAGE);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  if (isLoading) {
    return <div className={style.loading}>불러오는 중...</div>;
  }

  return (
    <div className={style.root}>
      <section className={style.section}>
        <h4 className={style.sectionTitle}>AI 기능 활성화</h4>
        <p className={style.sectionHint}>
          이 학기에서 AI 기능을 사용할 수 있도록 활성화합니다. 지침·라이브러리·역할
          권한은 학교 설정의 AI 탭에서 관리합니다.
        </p>
        <div className={style.statusCard}>
          <div className={style.statusMeta}>
            <span className={style.statusLabel}>현재 상태</span>
            <span
              className={`${style.statusValue} ${
                aiSettings.enabled ? style.statusOn : style.statusOff
              }`}
            >
              <span className={style.statusDot} />
              {aiSettings.enabled ? "활성화됨" : "비활성화됨"}
            </span>
          </div>
          <Button type="ghost" onClick={handleToggleEnabled}>
            {aiSettings.enabled ? "비활성화" : "활성화"}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default AISettings;
