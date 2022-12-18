import Tree from "components/tree/Tree";
import useApi from "hooks/useApi";
import { useEffect, useState } from "react";

type Props = {};

const E = (props: Props) => {
  const { RegistrationApi } = useApi();

  const [user, setUser] = useState();
  useEffect(() => {
    RegistrationApi.RRegistrations().then((res)=>{
      console.log(res);
    })
  }, []);

  return <div></div>;
};

export default E;
