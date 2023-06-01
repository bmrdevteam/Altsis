/**
 * @file User Edit Popup Tab Item - Schools
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

import { useState, useRef, useEffect } from "react";
import useApi from "hooks/useApi";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Select from "components/select/Select";
import Table from "components/tableV2/Table";

import useAPIv2 from "hooks/useAPIv2";
import { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  user: any;
  setUser: React.Dispatch<any>;
  updateUserList: (userId: string, userData: any) => void;
};

function Schools(props: Props) {
  const { SchoolApi } = useApi();
  const { UserAPI } = useAPIv2();

  const [refresh, setRefresh] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [schools, setSchools] = useState<
    { _id: string; schoolId: string; schoolName: string }[]
  >([]);
  const selectedSIDRef = useRef<string>("");

  const onClickAddHandler = async () => {
    try {
      if (selectedSIDRef.current === "") return;
      const { schools } = await UserAPI.CUserSchoolByAdmin({
        params: { uid: props.user._id },
        data: { sid: selectedSIDRef.current },
      });

      alert(SUCCESS_MESSAGE);
      props.user.schools = schools;
      props.setUser(props.user);
      setRefresh(true);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  const onClickRemoveHandler = async (sid: string) => {
    try {
      const { schools } = await UserAPI.DUserSchoolByAdmin({
        params: { uid: props.user._id },
        query: { sid },
      });
      alert(SUCCESS_MESSAGE);
      props.user.schools = schools;
      props.setUser(props.user);
      setRefresh(true);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  useEffect(() => {
    if (isLoading) {
      SchoolApi.RSchools()
        .then((schools: any[]) => {
          setSchools(schools);
        })
        .then(() => setIsLoading(false))
        .catch((err: any) => alert(err.response.data.message));
    }
  }, [isLoading]);

  useEffect(() => {
    if (refresh) {
      setRefresh(false);
    }
  }, [refresh]);

  return (
    <div className={style.popup}>
      <div style={{ marginTop: "24px" }} />
      <div style={{ display: "flex", alignItems: "end", gap: "12px" }}>
        <Select
          appearence="flat"
          label=""
          options={[
            { text: "", value: "" },
            ...schools.map((_school) => {
              return {
                text: `${_school.schoolName}(${_school.schoolId})`,
                value: _school._id,
              };
            }),
          ]}
          onChange={(e: string) => {
            selectedSIDRef.current = e;
          }}
        />
        <Button type="ghost" onClick={onClickAddHandler}>
          등록
        </Button>
      </div>
      {!refresh ? (
        <div style={{ marginTop: "12px" }}>
          <Table
            type="object-array"
            data={props.user.schools}
            header={[
              {
                text: "No",
                key: "tableRowIndex",
                type: "text",
                textAlign: "center",
              },
              {
                text: "학교 이름",
                key: "schoolName",
                fontSize: "12px",
                fontWeight: "600",
                textAlign: "center",
                width: "200px",
                type: "text",
              },
              {
                text: "학교 ID",
                key: "schoolId",
                fontSize: "12px",
                fontWeight: "600",
                textAlign: "center",
                width: "200px",
                type: "text",
              },
              {
                text: "삭제",
                key: "delete",
                type: "button",
                onClick: (e: any) => {
                  onClickRemoveHandler(e.school);
                },
                width: "80px",
                textAlign: "center",
                btnStyle: {
                  border: true,
                  color: "red",
                  padding: "4px",
                  round: true,
                },
              },
            ]}
          />
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}

export default Schools;
