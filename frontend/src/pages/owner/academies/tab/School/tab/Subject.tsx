/**
 * @file School Page Tab Item - Subject
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

import { useState, useEffect } from "react";
import useDatabase from "hooks/useDatabase";

import style from "style/pages/admin/schools.module.scss";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Table from "components/table/Table";
import _ from "lodash";
import useApi from "hooks/useApi";

type Props = {
  academy: string;
  schoolData: any;
};

type subjectDataListType = {
  [key: string]: string;
};

const Subject = (props: Props) => {
  const { SchoolApi } = useApi();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /* subject label list */
  const [subjectLabelList, setSubjectLabelList] = useState<string[]>(
    props.schoolData.subjects?.label || []
  );
  const [subjectLabel, setSubjectLabel] = useState<string>("");

  /* subject data list */
  const [subjectDataList, setSubjectDataList] = useState<any>();
  const [subjectData, setSubjectData] = useState<string>("");

  /* subject data header list */
  const [subjectDataHeader, setSubjectDataHeader] = useState<any>([]);

  const updateSubjectDataList = () => {
    const subjectDataList = [];
    for (let i = 0; i < props.schoolData.subjects?.data.length; i++) {
      let data: subjectDataListType = {};
      for (let j = 0; j < props.schoolData.subjects?.data[i].length; j++) {
        data[subjectLabelList[j]] = props.schoolData.subjects?.data[i][j];
      }
      subjectDataList.push(data);
    }
    setSubjectDataList(subjectDataList);
  };

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

  useEffect(() => {
    updateSubjectDataList();
    updateSubjectDataHeader();
    setIsLoading(false);
    return () => {};
  }, [isLoading]);

  return (
    <div className={style.popup}>
      <div className={style.title} style={{ marginTop: "24px" }}>
        Label 추가하기
      </div>

      <div className={style.row}>
        <Input
          style={{ minHeight: "30px" }}
          onChange={(e: any) => {
            setSubjectLabel(e.target.value);
          }}
          appearence={"flat"}
        />

        <Button
          type={"ghost"}
          onClick={() => {
            setSubjectLabelList([...subjectLabelList, subjectLabel]);
            updateSubjectDataHeader();
            setIsLoading(true);
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
        data={subjectLabelList || []}
        type="string-array"
        header={[
          {
            text: "ID",
            key: "",
            type: "index",
            width: "48px",
            align: "center",
          },
          {
            text: "Label",
            key: 0,
            type: "string",
          },
          {
            text: "삭제",
            key: "index",
            type: "button",
            onClick: (e: any) => {
              subjectLabelList.splice(e.index, 1);
              setSubjectLabelList([...subjectLabelList]);
              updateSubjectDataHeader();
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

      <div className={style.title} style={{ marginTop: "24px" }}>
        Data 추가하기
      </div>

      <div className={style.row}>
        <Input
          style={{ minHeight: "30px" }}
          onChange={(e: any) => {
            setSubjectData(e.target.value);
          }}
          appearence={"flat"}
          placeholder={"ex) 미술/서양미술사"}
        />

        <Button
          type={"ghost"}
          onClick={() => {
            const _subjectData = subjectData.split("/");
            let data: subjectDataListType = {};
            for (let j = 0; j < subjectLabelList.length; j++) {
              data[subjectLabelList[j]] = _subjectData[j];
            }
            setSubjectDataList([...subjectDataList, data]);
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
        data={!isLoading ? subjectDataList : []}
        header={[
          {
            text: "ID",
            key: "",
            type: "index",
            width: "48px",
            align: "center",
          },
          ...subjectDataHeader,
          {
            text: "삭제",
            key: "index",
            type: "button",
            onClick: (e: any) => {
              subjectDataList.splice(
                _.findIndex(subjectDataList, (x) => _.isEqual(x, e)),
                1
              );
              setSubjectDataList([...subjectDataList]);
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

      <Button
        type={"ghost"}
        style={{
          borderRadius: "4px",
          height: "32px",
          margin: "24px 0",
          boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
        }}
        onClick={() => {
          SchoolApi.USchoolSubject({
            academyId: props.academy,
            schoolId: props.schoolData?._id,
            data: {
              label: subjectLabelList,
              data: subjectDataList.map((data: any) => {
                const _data = [];
                for (let i = 0; i < subjectLabelList.length; i++) {
                  _data.push(data[subjectLabelList[i]]);
                }
                return _data;
              }),
            },
          })
            .then(() => {
              alert("success");
            })
            .catch((err) => {
              alert(err.response.data.message);
            });
        }}
      >
        수정하기
      </Button>
    </div>
  );
};

export default Subject;
