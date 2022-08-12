

import { useParams } from "react-router-dom";

type Props = {};

const CannotFindUser = ({ userId }: { userId?: string }) => {
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
        유져 <strong>{userId}</strong>
        를 찾을 수 없습니다 <br />
      </div>
    </div>
  );
};

const User = (props: Props) => {
  const { pid } = useParams<"pid">();

  // useEffect(() => {
  //   //get User from backend
  //   return () => {

  //   }
  // }, [])

  //if the user cannot locate the User using the id return "CannotFindUser" page

  if(true){
    return <CannotFindUser userId={pid} />;
  }

  return <div></div>

};

export default User;
