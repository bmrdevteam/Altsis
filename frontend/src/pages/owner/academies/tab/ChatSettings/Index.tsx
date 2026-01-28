/**
 * @file Academy Pid Page Tab Item - ChatSettings
 *
 * @author
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 * @version 1.0
 *
 */
import Button from "components/button/Button";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  academyData: any;
  setAcademyData: React.Dispatch<any>;
};

const ChatSettings = (props: Props) => {
  const { AcademyAPI } = useAPIv2();

  const onClickToggleChatHandler = async () => {
    const action = props.academyData.chatEnabled ? "비활성화" : "활성화";
    if (!window.confirm(`정말 채팅을 ${action}하시겠습니까?`)) return;

    try {
      const { academy } = await AcademyAPI.UAcademyChatEnabled({
        params: {
          academyId: props.academyData.academyId,
        },
        data: {
          chatEnabled: !props.academyData.chatEnabled,
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
          <h3 style={{ marginBottom: "12px" }}>채팅 기능</h3>
          <p style={{ color: "var(--accent-3)", marginBottom: "24px" }}>
            채팅 기능을 활성화하면 아카데미 사용자들이 서로 실시간으로 메시지를
            주고받을 수 있습니다.
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
                  color: props.academyData.chatEnabled
                    ? "var(--color-g4)"
                    : "var(--accent-3)",
                }}
              >
                {props.academyData.chatEnabled ? "활성화됨" : "비활성화됨"}
              </div>
            </div>

            <Button
              type="ghost"
              style={{
                borderRadius: "4px",
                height: "32px",
              }}
              onClick={onClickToggleChatHandler}
            >
              {props.academyData.chatEnabled ? "채팅 비활성화" : "채팅 활성화"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSettings;
