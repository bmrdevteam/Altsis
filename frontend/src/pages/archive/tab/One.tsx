import Button from "components/button/Button";
import Table from "components/tableV2/Table";
import { useAuth } from "contexts/authContext";
import _ from "lodash";
import React from "react";
import style from "style/pages/archive.module.scss";
type Props = {
  users: any[];
  archive?: string;
  formData?: React.MutableRefObject<any>;
  setUserId: React.Dispatch<React.SetStateAction<string>>;
  userId: string;
  userArchiveData: any;
};

const One = (props: Props) => {
  // console.log(props.userArchiveData);

  const { currentSchool } = useAuth();
  function archiveData() {
    return (
      currentSchool.formArchive?.filter((val: any) => {
        return val.label === props.archive;
      })[0] ?? { fields: [] }
    );
  }
  function archiveHeader() {
    let arr: any = [];
    archiveData().fields?.map((val: any) => {
      if (val.type === "select") {
        arr.push({
          text: val.label,
          whiteSpace: "pre",
          key: val.label,
          type: "select",
          option: val.options,
        });
      } else if (val.type === "input-number") {
        arr.push({
          text: val.label,
          whiteSpace: "pre",
          key: val.label,
          type: "input-number",
        });
      } else {
        arr.push({
          byteCalc: true,
          text: val.label,
          key: val.label,
          type: val.type,
        });
      }
    });
    arr.push({
      text: "수정",
      type: "rowEdit",
      width: "72px",
      textAlign: "center",
      fontSize: "12px",
      btnStyle: {
        round: true,
        border: true,
        padding: "4px",
        color: "red",
        background: "#FFF1F1",
      },
      fontWeight: "600",
    });
    return arr;
  }

  return archiveData().dataType === "object" ? (
    <div className={style.content}>
      {archiveData().fields?.map((val: any, index: number) => {
        return (
          <div className={style.field} key={index}>
            <div className={style.label}>{val.label}</div>
            <textarea
              defaultValue={props.userArchiveData?.[val.label]}
              className={style.input}
              rows={1}
            />
          </div>
        );
      })}
    </div>
  ) : (
    <>
      {props.formData?.current && (
        <>
          <Button type="ghost"> 저장</Button>
          <div style={{ marginTop: "24px" }}>
            <Table
              onChange={(value) => {
                // console.log(value);
              }}
              type="object-array"
              data={props.userArchiveData ?? []}
              header={archiveHeader()}
            />
          </div>
        </>
      )}
    </>
  );
};

export default One;
