import { archiveTestData } from "archiveTest";
import Button from "components/button/Button";
import Divider from "components/divider/Divider";
import Autofill from "components/input/Autofill";
import Input from "components/input/Input";
import Select from "components/select/Select";
import Table, { TTableHeader, TTableItemType } from "components/table/Table";
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";
import _ from "lodash";
import React, { useEffect, useState } from "react";
import style from "style/pages/archive.module.scss";
type Props = {
  users: any[];
  archive?: string;
  setUserId: React.Dispatch<React.SetStateAction<string>>;
  userId: string;
  userArchiveData: any;
};

const One = (props: Props) => {
  function archiveData() {
    return (
      archiveTestData.filter((val) => {
        return val.label === props.archive;
      })[0] ?? { fields: [] }
    );
  }
  function archiveHeader() {
    let arr: TTableHeader = [];
    archiveData().fields?.map((val: any) => {
      if (val.type === "select") {
        arr.push({
          text: val.label,
          key: val.label,
          type: "select",
          selectOptions: val.options,
        });
      } else {
        arr.push({
          text: val.label,
          key: val.label,
          type: val.type as TTableItemType,
        });
      }
    });
    arr.push({
      text: "삭제",
      key: "",
      width: "72px",
      align: "center",
      type: "button",
    });
    return arr;
  }

  return (
    <>
      <Button type="ghost" style={{ marginTop: "24px", height: "30px" }}>
        저장
      </Button>
      {archiveData().dataType === "object" ? (
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
        <div style={{ marginTop: "24px" }}>
          <Table
            type="object-array"
            data={props.userArchiveData}
            header={archiveHeader()}
          />
        </div>
      )}
    </>
  );
};

export default One;
