/**
 * @file Seasons Page Tab Item - Remove
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

// components
import Button from "components/button/Button";

import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Callout from "components/callout/Callout";

type Props = {
  _id: string;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
};

const Form = (props: Props) => {
  const { SeasonAPI } = useAPIv2();

  const onClickRemoveHandler = async () => {
    if (
      !window.confirm(
        "정말 삭제하시겠습니까? 학기의 모든 데이터가 삭제되며 이 작업은 되돌릴 수 없습니다."
      )
    )
      return;
    try {
      await SeasonAPI.DSeason({
        params: {
          _id: props._id,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.setIsLoading(true);
      props.setPopupActive(false);
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
          title={"학기 삭제"}
          description={
            "학기의 모든 데이터가 삭제되며 이 작업은 되돌릴 수 없습니다."
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

export default Form;
