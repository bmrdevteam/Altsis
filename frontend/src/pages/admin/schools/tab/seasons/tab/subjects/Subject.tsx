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
import useApi from "hooks/useApi";
import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Table from "components/tableV2/Table";

import UpdateBulk from "./tab/updateBulk";

type Props = {
  _id: string;
};

const Subjects = (props: Props) => {
  const { SeasonApi } = useApi();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /* subject label list */
  const [subjectLabelList, setSubjectLabelList] = useState<any[]>([]);
  const [subjectDataList, setSubjectDataList] = useState<any[]>([]);

  const subjectDataRef = useRef<string>("");
  const subjectLabelRef = useRef<string>("");

  /* subject data header & object list */
  const [subjectDataHeader, setSubjectDataHeader] = useState<any>([]);
  const [subjectObjectList, setSubjectObjectList] = useState<any[]>([]);

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
        key: subjectLabelList[j],
        type: "string",
      });
    }
    setSubjectDataHeader(_subjectDataHeader);

    // parse data
    setSubjectObjectList(
      subjectDataList.map((data: any) =>
        subjectLabelList.reduce(
          (ac: any[], a: string, idx: number) => ({ ...ac, [a]: data[idx] }),
          {}
        )
      )
    );
  };

  useEffect(() => {
    if (isLoading) {
      SeasonApi.RSeason(props._id)
        .then((res) => {
          setSubjects(res.subjects);
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
              if (subjectLabelRef.current !== "" && e.key === "Enter") {
                SeasonApi.USeasonSubject({
                  _id: props._id,
                  data: {
                    label: subjectLabelRef.current.split("/"),
                    data: subjectDataList,
                  },
                })
                  .then((res: any) => {
                    alert("success");
                    setSubjects(res.subjects);
                  })
                  .catch((err) => {
                    console.log(err.response.data.message);
                    // alert(err.response.data.message);
                  });
              }
            }}
          />
          <Button
            type={"ghost"}
            onClick={() => {
              if (subjectLabelRef.current !== "") {
                SeasonApi.USeasonSubject({
                  _id: props._id,
                  data: {
                    label: subjectLabelRef.current.split("/"),
                    data: subjectDataList,
                  },
                })
                  .then((res: any) => {
                    alert("success");
                    setSubjects(res.subjects);
                  })
                  .catch((err) => {
                    console.log(err.response.data.message);
                    // alert(err.response.data.message);
                  });
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
                SeasonApi.USeasonSubject({
                  _id: props._id,
                  data: {
                    label: subjectLabelList,
                    data: [
                      ...subjectDataList,
                      subjectDataRef.current.split("/"),
                    ],
                  },
                })
                  .then((res: any) => {
                    alert("success");
                    setSubjects(res.subjects);
                  })
                  .catch((err) => {
                    console.log(err.response.data.message);
                    // alert(err.response.data.message);
                  });
              }
            }}
          />

          <Button
            type={"ghost"}
            onClick={() => {
              if (subjectDataRef.current !== "") {
                SeasonApi.USeasonSubject({
                  _id: props._id,
                  data: {
                    label: subjectLabelList,
                    data: [
                      ...subjectDataList,
                      subjectDataRef.current.split("/"),
                    ],
                  },
                })
                  .then((res: any) => {
                    alert("success");
                    setSubjects(res.subjects);
                  })
                  .catch((err) => {
                    console.log(err.response.data.message);
                    // alert(err.response.data.message);
                  });
              }
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
        {!isLoading && (
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
                key: "delete",
                type: "button",
                onClick: (e: any) => {
                  subjectDataList.splice(e.tableRowIndex - 1, 1);

                  SeasonApi.USeasonSubject({
                    _id: props._id,
                    data: {
                      label: subjectLabelList,
                      data: subjectDataList,
                    },
                  })
                    .then((res: any) => {
                      alert("success");
                      setSubjects(res.subjects);
                    })
                    .catch((err) => {
                      console.log(err.response.data.message);
                      // alert(err.response.data.message);
                    });
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
