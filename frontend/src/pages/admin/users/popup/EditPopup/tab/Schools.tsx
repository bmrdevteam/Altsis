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

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Select from "components/select/Select";
import Table from "components/tableV2/Table";
import ToggleSwitch from "components/toggleSwitch/ToggleSwitch";

import useAPIv2 from "hooks/useAPIv2";
import { ALERT_ERROR } from "hooks/useAPIv2";
import { resolveSchoolAuth } from "utils/schoolManager";

type Props = {
  user: any;
  setUser: React.Dispatch<any>;
};

function Schools(props: Props) {
  const { UserAPI, SchoolAPI } = useAPIv2();

  const [refresh, setRefresh] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [schools, setSchools] = useState<
    { _id: string; schoolId: string; schoolName: string }[]
  >([]);
  const selectedSIDRef = useRef<string>("");
  const schoolsRef = useRef(props.user.schools || []);
  const saveChainRef = useRef(Promise.resolve());
  const [newAsManager, setNewAsManager] = useState<boolean>(
    props.user?.auth === "manager"
  );

  const membershipRows = (props.user.schools || []).map((s: any) => ({
    ...s,
    isSchoolMgr: resolveSchoolAuth(s.schoolAuth, props.user.auth) === "manager",
  }));

  const onClickAddHandler = async () => {
    try {
      if (selectedSIDRef.current === "") return;
      const { schools } = await UserAPI.CUserSchool({
        params: { uid: props.user._id },
        data: {
          sid: selectedSIDRef.current,
          schoolAuth: newAsManager ? "manager" : "member",
        },
      });

      alert(SUCCESS_MESSAGE);
      schoolsRef.current = schools;
      props.user.schools = schools;
      props.setUser(props.user);
      setRefresh(true);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  const onClickRemoveHandler = async (sid: string) => {
    try {
      const { schools } = await UserAPI.DUserSchool({
        params: { uid: props.user._id },
        query: { sid },
      });
      alert(SUCCESS_MESSAGE);
      schoolsRef.current = schools;
      props.user.schools = schools;
      props.setUser(props.user);
      setRefresh(true);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  const onToggleSchoolManager = (rows: any[]) => {
    saveChainRef.current = saveChainRef.current
      .catch(() => undefined)
      .then(async () => {
        for (const row of rows) {
          const want: "manager" | "member" = row.isSchoolMgr
            ? "manager"
            : "member";
          const current = (schoolsRef.current || []).find(
            (s: any) => String(s.school) === String(row.school)
          );
          const currentAuth = resolveSchoolAuth(
            current?.schoolAuth,
            props.user.auth
          );
          if (want === currentAuth) continue;
          try {
            const { schools } = await UserAPI.UUserSchool({
              params: { uid: props.user._id },
              data: { sid: String(row.school), schoolAuth: want },
            });
            schoolsRef.current = schools;
            props.user.schools = schools;
            props.setUser({ ...props.user, schools });
          } catch (err: any) {
            ALERT_ERROR(err);
            setRefresh(true);
          }
        }
      });
  };

  useEffect(() => {
    schoolsRef.current = props.user.schools || [];
  }, [props.user._id]);

  useEffect(() => {
    if (isLoading) {
      SchoolAPI.RSchools()
        .then(({ schools }) => {
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
            이 학교 관리자
          </span>
          <ToggleSwitch
            checked={newAsManager}
            onChange={(b) => setNewAsManager(b)}
          />
        </div>
        <Button type="ghost" onClick={onClickAddHandler}>
          등록
        </Button>
      </div>
      {!refresh ? (
        <div style={{ marginTop: "12px" }}>
          <Table
            type="object-array"
            data={membershipRows}
            onChange={onToggleSchoolManager}
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
                width: "160px",
                type: "text",
              },
              {
                text: "이 학교 관리자",
                key: "isSchoolMgr",
                type: "toggle",
                textAlign: "center",
                width: "120px",
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
