import React from "react";
import FIleUploader from "../../components/fileUploader/FIleUploader";

import Select from "../../components/select/Select";
import Table from "../../components/table/Table";
import useSearch from "../../hooks/useSearch";
import style from "../../style/pages/admin/users.module.scss";

type Props = {};

const Users = (props: Props) => {
  const search = useSearch([
    { id: "asdf", name: "namefusefas" },
    { id: "aassdf", name: "namefuefas" },
    { id: "asdqwef", name: "1" },
    { id: "asdsfasddf", name: "namefuefas" },
    { id: "asdf", name: "namefuefas" },
    { id: "asdwqef", name: "namefuefas" },
    { id: "asdf", name: "namefuefas" },
    { id: "asdf", name: "namefuefas" },
    { id: "dasdf", name: "asdfkje4sadnfeevdfdw" },
  ]);

  console.log(search.result());

  return (
    <div className={style.section}>
      <div className={style.title}>아카데미 유저 관리</div>
      <div className={style.filter_container}>
        <div className={style.filter}>
          <Select
            options={[
              { text: "ID", value: "id" },
              { text: "Name", value: "name" },
              { text: "Role", value: "role" },
            ]}
          />

          <Select
            options={[
              { text: "=", value: "=" },
              { text: ">", value: ">" },
            ]}
          />
          <input type="text" placeholder="검색" className={style.value} />
        </div>
      </div>
      <div style={{ height: "24px" }}></div>
      <div style={{ backgroundColor: "#fff" }}>
        <FIleUploader />

        <Table
          data={search.result()}
          header={[
            {
              text: "",
              key: "",
              type: "checkbox",
              width: "48px",
              align: "center",
            },
            {
              text: "id",
              key: "",
              type: "index",
              width: "48px",
              align: "center",
            },
            { text: "the firsta", key: "id", type: "string", align: "right" },
            { text: "namefield", key: "name", type: "string" },
          ]}
        />
      </div>

      {/* <List
        header={[
          { text: "ID", value: "id" },
          { text: "Name", value: "name" },
          { text: "Role", value: "role" },
        ]}
        data={[
          { id: "asdf", name: "namefuefas" },
          { id: "dasdf", name: "asdfkje4sadnfeevdfdw" },
        ]}
        widthRatio={[1, 2, 1]}
      /> */}
    </div>
  );
};

export default Users;
