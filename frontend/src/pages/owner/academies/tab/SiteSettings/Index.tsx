import Button from "components/button/Button";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  academyData: any;
  setAcademyData: React.Dispatch<any>;
};

const SiteSettings = (props: Props) => {
  const { AcademyAPI } = useAPIv2();
  const shiftEnabled = props.academyData?.plans?.shift?.enabled !== false;
  const siteEnabled = !!props.academyData.sitePublishEnabled;
  const canToggle = shiftEnabled || siteEnabled;

  const onClickToggleSiteHandler = async () => {
    if (!canToggle) return;
    const action = siteEnabled ? "비활성화" : "활성화";
    if (
      !window.confirm(`정말 공개 웹사이트 기능을 ${action}하시겠습니까?`)
    )
      return;

    try {
      const { academy } = await AcademyAPI.UAcademySitePublishEnabled({
        params: {
          academyId: props.academyData.academyId,
        },
        data: {
          sitePublishEnabled: !props.academyData.sitePublishEnabled,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.setAcademyData(academy);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  return (
    <div>
      <div
        style={{
          marginTop: "24px",
          display: "flex",
          gap: "24px",
          flexDirection: "column",
        }}
      >
        <div>
          <h3 style={{ marginBottom: "12px" }}>공개 웹사이트</h3>
          <p style={{ color: "var(--accent-3)", marginBottom: "24px" }}>
            활성화하면 아카데미 관리자가 정적 웹사이트 파일을 업로드·편집하고
            외부에 공개할 수 있습니다. 비활성화하면 게시가 즉시 중단됩니다.
          </p>
          {!shiftEnabled && (
            <p style={{ color: "var(--color-r4, #d9534f)", marginBottom: "16px" }}>
              SHIFT 모듈이 꺼져 있어 웹사이트를 켤 수 없습니다. 플랜 탭에서
              SHIFT를 먼저 켜 주세요.
            </p>
          )}

          <div
            style={{
              padding: "16px",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>현재 상태</div>
              <div
                style={{
                  marginTop: "4px",
                  color: props.academyData.sitePublishEnabled
                    ? "var(--color-g4)"
                    : "var(--accent-3)",
                }}
              >
                {props.academyData.sitePublishEnabled
                  ? "활성화됨"
                  : "비활성화됨"}
              </div>
            </div>

            <Button
              type="ghost"
              disabled={!canToggle}
              style={{
                borderRadius: "4px",
                height: "32px",
              }}
              onClick={onClickToggleSiteHandler}
            >
              {siteEnabled ? "웹사이트 비활성화" : "웹사이트 활성화"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteSettings;
