/**
 * @file Academy Pid Page Tab Item - Remove
 *
 * @author jessie129j <jessie129j@gmail.com>
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
import useAPIv2 from "hooks/useAPIv2";
import { ALERT_ERROR } from "hooks/useAPIv2";
import Callout from "components/callout/Callout";
import { useNavigate } from "react-router-dom";

type Props = {
  academyData: any;
};

const Academy = (props: Props) => {
  const { AcademyAPI } = useAPIv2();
  const navigate = useNavigate();

  const onClickRemoveHandler = async () => {
    if (
      !window.confirm(
        "정말 삭제하시겠습니까? DB의 모든 데이터가 삭제되며 이 작업은 되돌릴 수 없습니다."
      )
    )
      return;
    try {
      await AcademyAPI.DAcademy({
        params: {
          academyId: props.academyData.academyId,
        },
      });
      alert(SUCCESS_MESSAGE);
      navigate("/owner/academies", { replace: true });
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
        <Callout
          type={"warning"}
          showIcon
          title={"아카데미 삭제"}
          child={
            <ul>
              <li>
                {
                  "'아카데미' 탭에서 아카데미를 비활성화한 후 '삭제' 버튼을 클릭합니다."
                }
              </li>
              <li>
                {
                  "아카데미 DB의 모든 데이터가 삭제되며 이 작업은 되돌릴 수 없습니다."
                }
              </li>
            </ul>
          }
        />
        {!props.academyData.isActivated && (
          <Button
            type={"solid"}
            style={{
              borderRadius: "4px",
              height: "32px",
              color: "white",
              backgroundColor: "red",
            }}
            onClick={onClickRemoveHandler}
          >
            {"삭제"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Academy;
