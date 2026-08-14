import Button from "components/button/Button";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  academyData: any;
  setAcademyData: React.Dispatch<any>;
};

const BoardSettings = (props: Props) => {
  const { AcademyAPI } = useAPIv2();
  const shiftEnabled = props.academyData?.plans?.shift?.enabled !== false;
  const boardEnabled = props.academyData.boardEnabled !== false;
  const canToggle = shiftEnabled || boardEnabled;

  const onClickToggleBoardHandler = async () => {
    if (!canToggle) return;
    const action = boardEnabled ? "비활성화" : "활성화";
    if (!window.confirm(`정말 보드를 ${action}하시겠습니까?`)) return;

    try {
      const { academy } = await AcademyAPI.UAcademyBoardEnabled({
        params: {
          academyId: props.academyData.academyId,
        },
        data: {
          boardEnabled: !props.academyData.boardEnabled,
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
          <h3 style={{ marginBottom: "12px" }}>보드 기능</h3>
          <p style={{ color: "var(--accent-3)", marginBottom: "24px" }}>
            보드 기능을 활성화하면 아카데미 사용자들이 보드를 생성하고 게시글을
            작성할 수 있습니다.
          </p>
          {!shiftEnabled && (
            <p style={{ color: "var(--color-r4, #d9534f)", marginBottom: "16px" }}>
              SHIFT 모듈이 꺼져 있어 보드를 켤 수 없습니다. 플랜 탭에서 SHIFT를
              먼저 켜 주세요.
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
                  color: props.academyData.boardEnabled
                    ? "var(--color-g4)"
                    : "var(--accent-3)",
                }}
              >
                {props.academyData.boardEnabled ? "활성화됨" : "비활성화됨"}
              </div>
            </div>

            <Button
              type="ghost"
              disabled={!canToggle}
              style={{
                borderRadius: "4px",
                height: "32px",
              }}
              onClick={onClickToggleBoardHandler}
            >
              {boardEnabled ? "보드 비활성화" : "보드 활성화"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardSettings;
