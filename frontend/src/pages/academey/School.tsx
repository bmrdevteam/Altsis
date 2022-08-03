import React from "react";
import { useParams } from "react-router-dom";

type Props = {};

const CannotFindSchool = ({ schoolId }: { schoolId?: string }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
      }}
    >
      <div style={{ textAlign: "center" }}>
        학교<strong>{schoolId}</strong>
        를 찾을 수 없습니다 <br />
        <span style={{ cursor: "pointer" }}>학교 추가하기</span>
      </div>
    </div>
  );
};

const School = (props: Props) => {
  const { pid } = useParams<"pid">();

  // useEffect(() => {
  //   //get school from backend
  //   return () => {

  //   }
  // }, [])

  //if the user cannot locate the school using the id return "CannotFindSchool" page

  if(false){
    return <CannotFindSchool schoolId={pid} />;
  }

  return <div></div>

};

export default School;
