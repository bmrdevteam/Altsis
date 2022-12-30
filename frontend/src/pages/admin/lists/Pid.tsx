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

  async function getList() {}

  return (
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
  );
}

export default List;
