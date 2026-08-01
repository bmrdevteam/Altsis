import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { invalidateGoalsCache } from "pages/goals/goalsCache";
import { TSchool } from "types/schools";

type FeatureKey =
  | "chatEnabled"
  | "boardEnabled"
  | "aiEnabled"
  | "goalsEnabled";

type Props = {
  featureKey: FeatureKey;
  label: string;
  description: string;
  schoolData: TSchool;
  setSchoolData?: (data: TSchool) => void;
  children?: React.ReactNode;
};

const SchoolFeatureToggle = ({
  featureKey,
  label,
  description,
  schoolData,
  setSchoolData,
  children,
}: Props) => {
  const { SchoolAPI } = useAPIv2();
  const { currentSchool, patchCurrentSchool } = useAuth();
  const schoolEnabled = schoolData[featureKey] !== false;

  const handleToggle = async (value: boolean) => {
    try {
      const { features } = await SchoolAPI.USchoolFeatureFlags({
        params: { _id: schoolData._id },
        data: { [featureKey]: value },
      });
      const nextFlags = {
        chatEnabled: features.chatEnabled,
        boardEnabled: features.boardEnabled,
        aiEnabled: features.aiEnabled,
        goalsEnabled: features.goalsEnabled,
      };
      setSchoolData?.({
        ...schoolData,
        ...nextFlags,
      });
      if (currentSchool?._id === schoolData._id) {
        patchCurrentSchool(nextFlags);
      }
      if (featureKey === "goalsEnabled") {
        invalidateGoalsCache();
      }
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  return (
    <div style={{ marginTop: "24px" }}>
      <div
        style={{
          padding: "16px",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          backgroundColor: "var(--background-color-2)",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600 }}>{label}</div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-color-2)",
                marginTop: "4px",
              }}
            >
              {description}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: schoolEnabled ? "var(--color-g4)" : "var(--accent-3)",
                marginTop: "4px",
              }}
            >
              {schoolEnabled ? "활성화됨" : "비활성화됨"}
            </div>
          </div>
          <ToggleSwitch checked={schoolEnabled} onChange={handleToggle} />
        </div>
      </div>
      {schoolEnabled && children}
    </div>
  );
};

export default SchoolFeatureToggle;
