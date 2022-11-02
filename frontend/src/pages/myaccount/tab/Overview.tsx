import Button from 'components/button/Button';
import { useAuth } from "contexts/authContext";
import Table from 'components/table/Table';
import style from "style/pages/myaccount/myaccount.module.scss";
import React from 'react'

type Props = {  
  usersData?: any;
}

const Overview = (props: Props) => {
  const {currentUser} = useAuth()
  console.log(currentUser)
  return (
    <div>
      <div className={style.settings_container}>
        <div className={style.container_title}>사용자 정보</div>
          <div style={{ display: "flex", flexFlow: "row wrap", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexGrow: "1", alignItems: "center", justifyContent: "center", fontWeight: "bold" }} >이름</div>
            <div style={{ display: "flex", flexGrow: "1", alignItems: "center", justifyContent: "center" }}>{currentUser.userName}</div>
            <div style={{ display: "flex", flexGrow: "1", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>직위</div>
            <div style={{ display: "flex", flexGrow: "1", alignItems: "center", justifyContent: "center" }}>{currentUser.auth}</div>
            <div style={{ display: "flex", flexGrow: "1", alignItems: "center", justifyContent: "center", fontWeight: "bold" }} >이메일</div>
            <div style={{ display: "flex", flexGrow: "1", alignItems: "center", justifyContent: "center" }}>{currentUser.email}</div>
            <Button
              type={"ghost"}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                flexGrow: "1"
              }}
            onClick={() => {
            }}
            >
            시간표
            </Button>
        </div>
      </div>
    <div className={style.settings_container}>
      <div className={style.container_title}>수업개설현황</div>
      {/* <Table
        data={props}
        header={[
        {
          text: "id",
          key: "",
          type: "index",
          width: "48px",
          align: "center",
        },
        { 
          text: "이름",
          key: "userName",
          type: "string",
          align: "right" 
        },
        ]}
      /> */}

    </div>
  </div>
  )
}

export default Overview