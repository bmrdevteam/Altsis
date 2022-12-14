import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "contexts/authContext";

import NavigationLinks from "components/navigationLinks/NavigationLinks";
import Tab from "components/tab/Tab";
import useDatabase from "hooks/useDatabase";
import { useParams } from "react-router-dom";
import style from "style/pages/admin/list.module.scss";
import Body from "./tab/Body";
import Header from "./tab/Header";
import Settings from "./tab/Settings";

type Props = {};

function List(props: Props) {
  const { pid } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  async function getList() {}

  useEffect(() => {
    if (currentUser.auth !== "admin" && currentUser.auth !== "manager") {
      alert("접근 권한이 없습니다.");
      navigate("/");
    } else {
      setIsAuthenticated(true);
    }
  }, [currentUser]);

  return isAuthenticated ? (
    <div className={style.section}>
      <NavigationLinks />
      <div className={style.title}>{pid}</div>
      <Tab
        items={{
          데이터베이스: <Body />,
          헤더: <Header />,
          설정: <Settings />,
        }}
        align={"flex-start"}
      />
    </div>
  ) : (
    <></>
  );
}

export default List;
