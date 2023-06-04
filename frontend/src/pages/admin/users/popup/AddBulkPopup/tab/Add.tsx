/**
 * @file User Add Bulk Popup Tab Item - Add
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

import React, { useState, useEffect } from "react";
import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Loading from "components/loading/Loading";
import Callout from "components/callout/Callout";

// functions
import useAPIv2 from "hooks/useAPIv2";
import { MESSAGE } from "hooks/_message";
import Popup from "components/popup/Popup";
import Progress from "components/progress/Progress";

type Props = {
  userListRef: React.MutableRefObject<any[]>;
  invalidUserCntRef: React.MutableRefObject<number>;
  schoolListRef: React.MutableRefObject<
    {
      _id: string;
      schoolId: string;
      schoolName: string;
      tableRowChecked: boolean;
    }[]
  >;
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  addUserList: (users: any[]) => void;
};

function Add(props: Props) {
  const { UserAPI } = useAPIv2();
  const [refresh, setRefresh] = useState<boolean>(false);

  const [failedUserList, setFailedUserList] = useState<
    { userId: string; message: string }[]
  >([]);
  const [ratio, setRatio] = useState<number>(0);

  const [isStatusPopupActive, setIsStatusPopupActive] =
    useState<boolean>(false);

  const onClickAddBulkHandler = async () => {
    setIsStatusPopupActive(true);

    const schools = props.schoolListRef.current?.map((school) => {
      return {
        school: school._id,
        schoolId: school.schoolId,
        schoolName: school.schoolName,
      };
    });

    const addedUserList = [];
    const failedUserList = [];
    for (let i = 0; i < props.userListRef.current.length; i++) {
      try {
        const { user } = await UserAPI.CUser({
          data: {
            ...props.userListRef.current[i],
            schools,
            auth: "member",
          },
        });
        addedUserList.push(user);
      } catch (err: any) {
        failedUserList.push({
          userId: props.userListRef.current[i].userId,
          message:
            MESSAGE.get(err.response?.data?.message ?? "") ??
            "알 수 없는 에러가 발생했습니다",
        });
      } finally {
        setRatio((i + 1) / props.userListRef.current.length);
      }
    }
    props.addUserList(addedUserList);
    setFailedUserList(failedUserList);
  };

  useEffect(() => {
    if (refresh) {
      setTimeout(() => {
        setRefresh(false);
      }, 500);
    }
  }, [refresh]);

  return !refresh ? (
    <>
      <div className={style.popup}>
        <div style={{ marginTop: "24px" }}>
          {props.invalidUserCntRef.current !== 0 && (
            <Callout
              type="error"
              showIcon
              title={`수정이 필요한 항목이 ${props.invalidUserCntRef.current}개 있습니다`}
            />
          )}
        </div>
        <div>
          <Button
            type={"ghost"}
            disabled={props.invalidUserCntRef.current !== 0}
            onClick={onClickAddBulkHandler}
            disableOnclick
            style={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              marginTop: "24px",
            }}
          >
            생성
          </Button>
        </div>
      </div>
      {isStatusPopupActive && (
        <Popup
          setState={() => {}}
          style={{ maxWidth: "640px", width: "100%" }}
          title="사용자 일괄 생성"
          contentScroll
        >
          <div className={style.popup}>
            <Progress value={ratio} style={{ margin: "12px 0px" }} />
            {failedUserList.length > 0 && (
              <Callout
                type="error"
                style={{ whiteSpace: "pre" }}
                title={"저장되지 않은 항목이 있습니다."}
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
      )}
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
}

export default Add;
