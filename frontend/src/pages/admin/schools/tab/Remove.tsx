/**
 * @file School Pid Page Tab Item - Remove
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
import { useAuth } from "contexts/authContext";
import _ from "lodash";

type Props = {
  schoolData: any;
};

const Index = (props: Props) => {
  const { SchoolAPI } = useAPIv2();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const onClickRemoveHandler = async () => {
    if (
      !window.confirm(
        "정말 삭제하시겠습니까? DB의 모든 데이터가 삭제되며 이 작업은 되돌릴 수 없습니다."
      )
    )
      return;
    try {
      await SchoolAPI.DSchool({
        params: {
          _id: props.schoolData._id,
        },
      });
      alert(SUCCESS_MESSAGE);
      if (
        _.find(
          currentUser.schools,
          (exSchool) => exSchool.school === props.schoolData._id
        )
      ) {
        return window.location.replace("/admin/schools/list");
      } else {
        navigate("/admin/schools/list", { replace: true });
      }
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
          title={"학교 삭제"}
          description={
            "DB의 모든 데이터가 삭제되며 이 작업은 되돌릴 수 없습니다."
          }
        />
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
      </div>
    </div>
  );
};

export default Index;
