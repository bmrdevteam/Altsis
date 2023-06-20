/**
 * @file Seasons Page Tab Item - Subjects
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
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

import { useState, useEffect, useRef } from "react";
import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Table from "components/tableV2/Table";

import UpdateBulk from "./UpdateBulkPopup/Index";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  _id: string;
};

const Subjects = (props: Props) => {
  const { SeasonAPI } = useAPIv2();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /* subject label list */
  const [subjectLabelList, setSubjectLabelList] = useState<any[]>([]);
  const [subjectDataList, setSubjectDataList] = useState<string[][]>([]);

  const subjectLabelRef = useRef<string>("");

  /* subject data header*/
  const [subjectDataHeader, setSubjectDataHeader] = useState<any[]>([]);

  /* popup activation */
  const [updateBulkPopup, setUpdateBulkPopupActive] = useState<boolean>(false);

  const setSubjects = (subjects: any) => {
    const subjectLabelList = subjects?.label || [];
    const subjectDataList = subjects?.data || [];

    setSubjectLabelList(subjectLabelList);
    setSubjectDataList(subjectDataList);

    // updateSubjectDataHeader
    const _subjectDataHeader = [];
    for (let j = 0; j < subjectLabelList.length; j++) {
      _subjectDataHeader.push({
        text: subjectLabelList[j],
        key: `${j}`,
        type: "string",
      });
    }
    setSubjectDataHeader(_subjectDataHeader);
  };

  const updateSubjectLabels = async () => {
    try {
      const { season } = await SeasonAPI.USeasonSubjects({
        params: { _id: props._id },
        data: {
          label: subjectLabelRef.current.split("/"),
          data: subjectDataList,
        },
      });
      alert(SUCCESS_MESSAGE);
      setSubjects(season.subjects);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  useEffect(() => {
    if (isLoading) {
      SeasonAPI.RSeason({ params: { _id: props._id } })
        .then(({ season }) => {
          setSubjects(season.subjects);
        })
        .then(() => setIsLoading(false));
    }
    return () => {};
  }, [isLoading]);

  return (
    <>
      <div className={style.popup}>
        <Button
          type={"ghost"}
          onClick={() => {
            setUpdateBulkPopupActive(true);
          }}
          style={{
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            marginTop: "24px",
          }}
        >
          파일로 일괄 수정
        </Button>

        <div className={style.title} style={{ marginTop: "24px" }}>
          헤더 수정하기
        </div>

        <div className={style.row}>
          <Input
            style={{ minHeight: "30px" }}
            onChange={(e: any) => {
              subjectLabelRef.current = e.target.value;
            }}
            appearence={"flat"}
            placeholder="ex) 교과/과목"
            onKeyDown={(e: any) => {
              if (e.key === "Enter" && subjectLabelRef.current !== "") {
                updateSubjectLabels();
              }
            }}
          />
          <Button
            type={"ghost"}
            onClick={() => {
              if (subjectLabelRef.current !== "") {
                updateSubjectLabels();
              }
            }}
            style={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            }}
          >
            수정
          </Button>
        </div>

        <div style={{ marginTop: "24px" }} />
        {!isLoading && (
          <Table
            type="object-array"
            data={subjectDataList}
            onChange={(e) => {
              const subjectDataList = e.map((v) => {
                const data = [];
                for (let i = 0; i < subjectDataHeader.length; i++) {
                  data.push(v[`${i}`]?.trim() ?? "");
                }
                return data;
              });
              SeasonAPI.USeasonSubjects({
                params: { _id: props._id },
                data: { label: subjectLabelList, data: subjectDataList },
              })
                .then(({ season }) => {
                  alert(SUCCESS_MESSAGE);
                  setSubjectDataList(season.subjects.data);
                })
                .catch((err) => {
                  ALERT_ERROR(err);
                  setIsLoading(true);
                });
            }}
            header={[
              {
                text: "순서",
                fontSize: "12px",
                fontWeight: "600",
                type: "rowOrder",
                width: "80px",
                textAlign: "center",
              },
              ...subjectDataHeader,
              {
                text: "수정",
                type: "rowEdit",
                fontSize: "12px",
                fontWeight: "600",
                textAlign: "center",
                width: "80px",
              },
            ]}
          />
        )}
      </div>
      {updateBulkPopup && (
        <UpdateBulk
          setPopupActive={setUpdateBulkPopupActive}
          _id={props._id}
          setSubjects={setSubjects}
        />
      )}
    </>
  );
};

export default Subjects;
