/**
 * @file User Edit Popup Index - Index
 *
 * @author jessie129j <jessie129j@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 * @version 1.0
 *
 */

// components
import Popup from "components/popup/Popup";
import Tab from "components/tab/Tab";

import Basic from "./tab/Basic";
import Schools from "./tab/Schools";
import Auth from "./tab/Auth";

type Props = {
  user: any;
  setUser: React.Dispatch<any>;
  updateUserList: (userId: string, userData: any) => void;
  setPopupAcitve: React.Dispatch<React.SetStateAction<boolean>>;
};

function Index(props: Props) {
  return (
    <Popup
      closeBtn
      setState={props.setPopupAcitve}
      title={`${props.user.userName}(${props.user.userId})`}
      contentScroll
    >
      <Tab
        dontUsePaths
        items={{
          "기본 정보": <Basic user={props.user} setUser={props.setUser} />,
          "소속 학교": (
            <Schools
              user={props.user}
              setUser={props.setUser}
              updateUserList={props.updateUserList}
            />
          ),
          로그인: (
            <Auth
              user={props.user}
              setUser={props.setUser}
              updateUserList={props.updateUserList}
            />
          ),
        }}
        align={"flex-start"}
      />
    </Popup>
  );
}

export default Index;
