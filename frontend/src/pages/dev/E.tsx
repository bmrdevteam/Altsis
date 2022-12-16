import Tree from "components/tree/Tree";
import useApi from "hooks/useApi";
import { useEffect, useState } from "react";

type Props = {};

const E = (props: Props) => {
  const { UserApi } = useApi();

  const [user, setUser] = useState();
  useEffect(() => {
    UserApi.RMySelf().then((res) => {
      setUser(res);
    });
    
  }, []);
  console.log(user);
  

  return <div></div>;
};

export default E;
