/**
 * @file User Add/Delete School Popup - Index
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

import React, { useEffect, useRef, useState } from "react";
import _ from "lodash";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import useApi from "hooks/useApi";
import useAPIv2 from "hooks/useAPIv2";
import Progress from "components/progress/Progress";
import { TSchool } from "types/schools";

// functions

type Props = {
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  selectedUserList: any[];
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

function Index(props: Props) {
  const { UserAPI, SchoolAPI } = useAPIv2();

  const [schoolList, setSchoolList] = useState<TSchool[]>([]);
  const schoolSelectRef = useRef<any[]>([]);

  const [statusPopupActive, setStatusPopupActive] = useState<boolean>(false);
  const [ratio, setRatio] = useState<number>(0);

  const onClickAddHandler = async () => {
    if (schoolSelectRef.current.length === 0) {
      return alert("선택된 학교가 없습니다.");
    }

    const requests = [];
    for (let user of props.selectedUserList) {
      for (let school of schoolSelectRef.current) {
        requests.push({ uid: user._id, sid: school._id });
      }
    }

    setStatusPopupActive(true);
    for (let i = 0; i < requests.length; i++) {
      try {
        await UserAPI.CUserSchool({
          params: { uid: requests[i].uid },
          data: {
            sid: requests[i].sid,
          },
        });
      } catch (err) {
      } finally {
        setRatio((i + 1) / requests.length);
      }
    }
  };

  const onClickRemoveHandler = async () => {
    if (schoolSelectRef.current.length === 0) {
      return alert("선택된 학교가 없습니다.");
    }

    const requests = [];
    for (let user of props.selectedUserList) {
      for (let school of schoolSelectRef.current) {
        requests.push({ uid: user._id, sid: school._id });
      }
    }

    setStatusPopupActive(true);
    for (let i = 0; i < requests.length; i++) {
      try {
        await UserAPI.DUserSchool({
          params: { uid: requests[i].uid },
          query: {
            sid: requests[i].sid,
          },
        });
      } catch (err) {
      } finally {
        setRatio((i + 1) / requests.length);
      }
    }
  };

  useEffect(() => {
    SchoolAPI.RSchools()
      .then(({ schools }) => {
        setSchoolList(schools);
      })
      .catch(() => {
        alert("failed to load data");
      });

    return () => {};
  }, []);

  return (
    <>
      <Popup
        title="학교 일괄 설정"
        closeBtn
        setState={props.setPopupActive}
        style={{ maxWidth: "680px", width: "100%" }}
        contentScroll
      >
        <div className={style.popup}>
          <div>
            선택된 아카데미 사용자를 학교에 등록하거나 취소할 수 있습니다.
          </div>
          <div style={{ marginTop: "24px" }}>
            <Table
              type="object-array"
              data={schoolList}
              onChange={(value: any[]) => {
                schoolSelectRef.current = _.filter(value, {
                  tableRowChecked: true,
                });
              }}
              header={[
                {
                  text: "선택",
                  key: "",
                  type: "checkbox",
                  width: "48px",
                },
                {
                  text: "학교 이름",
                  key: "schoolName",
                  type: "text",
                  textAlign: "center",
                },
                {
                  text: "학교 ID",
                  key: "schoolId",
                  type: "text",
                  textAlign: "center",
                },
              ]}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              marginTop: "24px",
            }}
          >
            <Button
              type={"ghost"}
              onClick={onClickAddHandler}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",

                flex: "auto",
              }}
            >
              + 선택된 학교에 등록
            </Button>
            <Button
              type={"ghost"}
              onClick={onClickRemoveHandler}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                flex: "auto",
              }}
            >
              + 선택된 학교 등록 취소
            </Button>
          </div>
        </div>
      </Popup>
      {statusPopupActive && (
        <Popup
          setState={() => {}}
          style={{ maxWidth: "640px", width: "100%" }}
          title="학교 일괄 설정"
          contentScroll
        >
          <div className={style.popup}>
            <Progress value={ratio} style={{ margin: "12px 0px" }} />
            {ratio === 1 && (
              <div>
                <Button
                  type={"ghost"}
                  onClick={() => {
                    props.setIsLoading(true);
                    props.setPopupActive(false);
                  }}
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
  );
}

export default Index;
