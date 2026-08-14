import { useEffect, useState } from "react";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Loading from "components/loading/Loading";
import PlansTab, { PlanHint } from "pages/owner/academies/tab/Plans/Index";
import AISettings from "pages/owner/academies/tab/AISettings/Index";
import { TAcademy } from "types/academies";
import style from "style/pages/admin/schools.module.scss";

const AdminPlans = () => {
  const { currentUser } = useAuth();
  const { AcademyAPI } = useAPIv2();
  const [academyData, setAcademyData] = useState<TAcademy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.academyId) return;
    let cancelled = false;
    (async () => {
      try {
        const { academy } = await AcademyAPI.RAcademy({
          query: { academyId: currentUser.academyId },
        });
        if (!cancelled) setAcademyData(academy);
      } catch (err) {
        if (!cancelled) ALERT_ERROR(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.academyId]);

  if (loading || !academyData) {
    return <Loading height={"calc(100vh - 55px)"} />;
  }

  const ctrlEnabled = !!(
    academyData.aiEnabled || academyData.plans?.ctrl?.enabled
  );

  return (
    <div className={style.section}>
      <div className={style.titleRow}>
        <div className={style.title}>플랜</div>
        <PlanHint
          align="left"
          label="플랜 안내"
          text={
            "아카데미 ALT / SHIFT / CTRL 사용량과 Alter API 키를 관리합니다. 1인당 일일 Alt 한도는 각 학교 AI 탭에서 설정합니다.\n\n한도는 소유자가 설정합니다. 키와 모델은 이 페이지 아래에서 관리하세요."
          }
        />
      </div>
      <PlansTab
        academyData={academyData}
        setAcademyData={setAcademyData}
        readOnly
      />
      {ctrlEnabled && (
        <AISettings
          academyData={academyData}
          setAcademyData={setAcademyData}
          showModuleToggle={false}
        />
      )}
    </div>
  );
};

export default AdminPlans;
