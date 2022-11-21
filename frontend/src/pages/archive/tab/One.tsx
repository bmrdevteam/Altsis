import { archiveTestData } from "archiveTest";
import Button from "components/button/Button";
import Divider from "components/divider/Divider";
import Autofill from "components/input/Autofill";
import Input from "components/input/Input";
import Select from "components/select/Select";
import Table from "components/table/Table";
import { useAuth } from "contexts/authContext";
import useDatabase from "hooks/useDatabase";
import React, { useEffect, useState } from "react";
import style from "style/pages/archive.module.scss";
type Props = {
  users: any[];
  archive?: string;
  setUserId: React.Dispatch<React.SetStateAction<string>>;
  userId: string;
};

const One = (props: Props) => {
  function archiveData() {
    return archiveTestData.filter((val) => {
      return val.label === props.archive;
    })[0];
  }
  console.log(props.userId);

  return (
    <>
      <div className={style.search}>
        <div className={style.label}>학생선택</div>
        <Select
          options={[{ text: "11학년", value: "11" }]}
          style={{ borderRadius: "4px", maxWidth: "120px" }}
        />
        <Autofill
          style={{ borderRadius: "4px" }}
          setState={props.setUserId}
          defaultValue={props.userId}
          options={[
            { text: "", value: "" },
            ...props.users?.map((val) => {
              return {
                value: val.userId,
                text: `${val.userName} / ${val.userId}`,
              };
            }),
          ]}
          placeholder={"검색"}
        />
      </div>
      <Divider />
      <Button type="ghost" style={{ marginTop: "24px", height: "30px" }}>
        저장
      </Button>
      {archiveData().dataType === "single" ? (
        <div className={style.content}>
          {archiveData().fields?.map((val) => {
            return (
              <div className={style.field}>
                <div className={style.label}>{val.label}</div>
                <textarea
                  defaultValue={props.userId}
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
            data={[]}
            header={
              archiveData().fields?.map((val, index) => {
                return {
                  text: val.label,
                  key: index,
                  type: "string",
                };
              }) ?? []
            }
          />
        </div>
      )}
    </>
  );
};

export default One;
