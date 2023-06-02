/**
 * @file User Remove Bulk Popup
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

import React, { useEffect, useState } from "react";

import style from "style/pages/admin/schools.module.scss";

// components
import Popup from "components/popup/Popup";

import useAPIv2 from "hooks/useAPIv2";

import _ from "lodash";
import { MESSAGE } from "hooks/_message";
import Button from "components/button/Button";
import Progress from "components/progress/Progress";
import Callout from "components/callout/Callout";

// functions

type Props = {
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  selectedUserList: any[];
  popUserList: (_ids: any[]) => void;
};

function RemoveBulk(props: Props) {
  const { UserAPI } = useAPIv2();

  const [ratio, setRatio] = useState<number>(0);
  const [failedUserList, setFailedUserList] = useState<
    { userId: string; message: string }[]
  >([]);

  const removeBulk = async () => {
    if (props.selectedUserList.length === 0) {
      alert("선택된 사용자가 없습니다.");
      props.setPopupActive(false);
      return;
    }

    if (_.find(props.selectedUserList, (user) => user.auth === "admin")) {
      alert("관리자는 삭제할 수 없습니다.");
      props.setPopupActive(false);
      return;
    }

    setRatio(0);
    const removedUIDList: string[] = [];
    const failedUserList: { userId: string; message: string }[] = [];

    for (let i = 0; i < props.selectedUserList.length; i++) {
      try {
        await UserAPI.DUser({ params: { _id: props.selectedUserList[i]._id } });
        removedUIDList.push(props.selectedUserList[i]._id);
      } catch (err: any) {
        failedUserList.push({
          userId: props.selectedUserList[i].userId,
          message:
            MESSAGE.get(err.response?.data?.message ?? "UNKNOWN") ??
            MESSAGE.get("UNKNOWN") ??
            "",
        });
      } finally {
        setRatio((i + 1) / props.selectedUserList.length);
      }
    }
    props.popUserList(removedUIDList);
    setFailedUserList(failedUserList);
  };

  useEffect(() => {
    removeBulk();
  }, []);

  return (
    <Popup
      setState={props.setPopupActive}
      style={{ maxWidth: "480px", width: "100%" }}
      closeBtn
      title="사용자 일괄 삭제"
      contentScroll
    >
      <div className={style.popup}>
        <Progress value={ratio} style={{ margin: "12px 0px" }} />
        {failedUserList.length > 0 && (
          <Callout
            type="error"
            style={{ whiteSpace: "pre" }}
            title={"삭제되지 않은 항목이 있습니다."}
            description={failedUserList
              .map(({ userId, message }) => `${userId}: ${message}`)
              .join("\n")}
          />
        )}
        {ratio === 1 && (
          <div>
            <Button
              type={"ghost"}
              onClick={() => props.setPopupActive(false)}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                marginTop: "24px",
              }}
            >
              확인
            </Button>
          </div>
        )}
      </div>
    </Popup>
  );
}

export default RemoveBulk;
