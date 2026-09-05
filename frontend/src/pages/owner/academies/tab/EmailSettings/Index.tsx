/**
 * @file Academy Pid Page Tab Item - EmailSettings
 *
 * Owner는 아카데미에서 이메일 알림을 쓸 수 있는지만 켠다.
 * SMTP·메일 유형은 아카데미 admin이 설정한다.
 */
import Button from "components/button/Button";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

const SUCCESS_MESSAGE = "저장되었습니다.";

type Props = {
  academyData: any;
  setAcademyData: React.Dispatch<any>;
};

const EmailSettings = (props: Props) => {
  const { AcademyAPI } = useAPIv2();
  const emailEnabled = !!props.academyData.emailNotifyEnabled;

  const onClickToggleEmailHandler = async () => {
    const action = emailEnabled ? "비활성화" : "활성화";
    if (!window.confirm(`정말 이메일 알림을 ${action}하시겠습니까?`)) return;

    try {
      const { academy } = await AcademyAPI.UAcademyEmailNotifyEnabled({
        params: {
          academyId: props.academyData.academyId,
        },
        data: {
          emailNotifyEnabled: !props.academyData.emailNotifyEnabled,
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
          <h3 style={{ marginBottom: "12px" }}>이메일 알림</h3>
          <p style={{ color: "var(--accent-3)", marginBottom: "24px" }}>
            허용하면 아카데미 관리자가 SMTP와 메일 유형을 설정하고, 사용자가
            수신을 켤 수 있습니다. 보낸 사람 서버는 여기서 넣지 않습니다.
          </p>

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
                  color: props.academyData.emailNotifyEnabled
                    ? "var(--color-g4)"
                    : "var(--accent-3)",
                }}
              >
                {props.academyData.emailNotifyEnabled
                  ? "허용됨"
                  : "허용되지 않음"}
              </div>
            </div>

            <Button
              type="ghost"
              style={{
                borderRadius: "4px",
                height: "32px",
              }}
              onClick={onClickToggleEmailHandler}
            >
              {emailEnabled ? "이메일 알림 비허용" : "이메일 알림 허용"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailSettings;
