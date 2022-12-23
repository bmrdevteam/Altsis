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
import useDatabase from "hooks/useDatabase";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Table from "components/tableV2/Table";

import UpdateBulk from "./tab/updateBulk";

import _ from "lodash";

type Props = {
  seasonData?: any;
  setSelectedSeason?: any;
};

const Subjects = (props: Props) => {
  const database = useDatabase();

  /* subject label list */
  const [subjectLabelList, setSubjectLabelList] = useState<any[]>([]);
  const subjectDataRef = useRef<string>("");
  const subjectLabelRef = useRef<string>("");

  /* subject data header & object list */
  const [subjectDataHeader, setSubjectDataHeader] = useState<any>([]);
  const [subjectObjectList, setSubjectObjectList] = useState<any[]>([]);

  /* popup activation */
  const [updateBulkPopup, setUpdateBulkPopupActive] = useState<boolean>(false);

  const updateSubjectDataHeader = () => {
    const subjectDataList = [];
    for (let j = 0; j < subjectLabelList.length; j++) {
      subjectDataList.push({
        text: subjectLabelList[j],
        key: subjectLabelList[j],
        type: "string",
      });
    }
    setSubjectDataHeader(subjectDataList);
  };

  const parseSubjectDataList = (labalList: any[], dataList: any[]) => {
    return dataList.map((data: any) =>
      labalList.reduce(
        (ac: any[], a: string, idx: number) => ({ ...ac, [a]: data[idx] }),
        {}
      )
    );
  };

  async function updateSubjects(
    subjectLabelList: any[],
    subjectDataList: any[]
  ) {
    const result = await database.U({
      location: `seasons/${props.seasonData?._id}/subjects`,
      data: {
        new: {
          label: subjectLabelList,
          data: subjectDataList,
        },
      },
    });
    return result;
  }

  useEffect(() => {
    setSubjectLabelList(props.seasonData.subjects?.label || []);
    return () => {};
  }, [props.seasonData]);

  useEffect(() => {
    updateSubjectDataHeader();
    if (props.seasonData?.subjects?.data) {
      setSubjectObjectList(
        parseSubjectDataList(subjectLabelList, props.seasonData?.subjects?.data)
      );
    }

    return () => {};
  }, [subjectLabelList]);

  return (
    <>
      {" "}
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
              if (subjectLabelRef.current !== "" && e.key === "Enter") {
                updateSubjects(
                  subjectLabelRef.current.split("/"),
                  props.seasonData?.subjects.data
                )
                  .then((res: any) => {
                    setSubjectLabelList(res.data.label);
                    props.seasonData.subjects = res.data;
                    props.setSelectedSeason(props.seasonData);
                    alert("success");
                  })
                  .catch((err) => {
                    alert(err.response.data.message);
                  });
              }
            }}
          />
          <Button
            type={"ghost"}
            onClick={() => {
              updateSubjects(
                subjectLabelRef.current.split("/"),
                props.seasonData?.subjects.data
              )
                .then((res: any) => {
                  setSubjectLabelList(res.data.label);
                  props.seasonData.subjects = res.data;
                  props.setSelectedSeason(props.seasonData);
                  alert("success");
                })
                .catch((err) => {
                  alert(err.response.data.message);
                });
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

        <div className={style.title} style={{ marginTop: "24px" }}>
          항목 추가하기
        </div>

        <div className={style.row}>
          <Input
            style={{ minHeight: "30px" }}
            onChange={(e: any) => {
              subjectDataRef.current = e.target.value;
            }}
            appearence={"flat"}
            placeholder={"ex) 미술/서양미술사"}
            onKeyDown={(e: any) => {
              if (subjectDataRef.current !== "" && e.key === "Enter") {
                updateSubjects(subjectLabelList, [
                  ...props.seasonData?.subjects.data,
                  subjectDataRef.current.split("/"),
                ])
                  .then((res: any) => {
                    setSubjectObjectList(
                      parseSubjectDataList(res.data.label, res.data.data)
                    );
                    props.seasonData.subjects = res.data;
                    props.setSelectedSeason(props.seasonData);
                    alert("success");
                  })
                  .catch((err) => {
                    alert(err.response.data.message);
                  });
              }
            }}
          />

          <Button
            type={"ghost"}
            onClick={() => {
              updateSubjects(subjectLabelList, [
                ...props.seasonData?.subjects.data,
                subjectDataRef.current.split("/"),
              ])
                .then((res: any) => {
                  setSubjectObjectList(
                    parseSubjectDataList(res.data.label, res.data.data)
                  );
                  props.seasonData.subjects = res.data;
                  props.setSelectedSeason(props.seasonData);
                  alert("success");
                })
                .catch((err) => {
                  alert(err.response.data.message);
                });
            }}
            style={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            }}
          >
            추가
          </Button>
        </div>

        <div style={{ marginTop: "24px" }} />
        <Table
          type="object-array"
          data={subjectObjectList || []}
          header={[
            {
              text: "No",
              type: "text",
              key: "tableRowIndex",
              width: "48px",
              textAlign: "center",
            },
            ...subjectDataHeader,
            {
              text: "삭제",
              key: "index",
              type: "button",
              textAlign: "center",
              onClick: (e: any) => {
                console.log("e is ", e);
                props.seasonData?.subjects.data.splice(e.tableRowIndex - 1, 1);

                updateSubjects(subjectLabelList, [
                  ...props.seasonData?.subjects.data,
                ])
                  .then((res: any) => {
                    setSubjectObjectList(
                      parseSubjectDataList(res.data.label, res.data.data)
                    );
                    props.seasonData.subjects = res.data;
                    props.setSelectedSeason(props.seasonData);
                    alert("success");
                  })
                  .catch((err) => {
                    alert(err.response.data.message);
                  });
              },

              width: "80px",
              align: "center",
              textStyle: {
                padding: "0 10px",
                border: "var(--border-default)",
                background: "rgba(255, 200, 200, 0.25)",
                borderColor: "rgba(255, 200, 200)",
              },
            },
          ]}
        />
      </div>
      {updateBulkPopup && (
        <UpdateBulk
          setPopupActive={setUpdateBulkPopupActive}
          seasonData={props.seasonData}
          setSelectedSeason={props.setSelectedSeason}
          setSubjectObjectList={setSubjectObjectList}
        />
      )}
    </>
  );
};

export default Subjects;
