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

import { useState, useRef, useEffect } from "react";
import useDatabase from "hooks/useDatabase";
import _ from "lodash";

// components
import Popup from "components/popup/Popup";
import Tab from "components/tab/Tab";

import Basic from "./tab/Basic";
import Schools from "./tab/Schools";
import SnsId from "./tab/SnsId";

type Props = {
  user: any;
  setUser: React.Dispatch<any>;
  updateUserList: (userId: string, userData: any) => void;
  setPopupAcitve: React.Dispatch<React.SetStateAction<boolean>>;
};

function Index(props: Props) {
  const database = useDatabase();
  const schoolSelectRef = useRef<any[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  /* document fields */
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [schools, setSchools] = useState<any[]>();
  const [schoolsText, setSchoolsText] = useState<string>("");
  const [auth, setAuth] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [google, setGoogle] = useState<string>("");
  const [tel, setTel] = useState<string>("");

  /* Popup Activation */
  const [isEditSchoolPopupActive, setIsEditSchoolPopupActive] =
    useState<boolean>(false);

  async function updateUser() {
    const result = database.U({
      location: `users/${props.user}`,
      data: {
        schools,
        auth,
        tel: tel && tel !== "" ? tel : undefined,
        email: email && email !== "" ? email : undefined,
        snsId: { google: google && google !== "" ? google : undefined },
      },
    });
    return result;
  }

  async function getUser() {
    const res = await database.R({
      location: `users/${props.user}`,
    });
    return res;
  }

  useEffect(() => {
    // console.log("auth is ", auth);
  }, [auth]);

  useEffect(() => {
    if (isLoading) {
      getUser()
        .then((res: any) => {
          setUserId(res.userId);
          setUserName(res.userName);
          setSchools(res.schools);
          setAuth(res.auth);
          setEmail(res.email);
          setTel(res.tel);
          setGoogle(res.snsId?.google);
        })
        .then(() => setIsLoading(false))
        .catch((err: any) => alert(err.response.data.message));
    }
  }, [isLoading]);

  useEffect(() => {
    if (schools) {
      setSchoolsText(
        schools.length !== 0
          ? _.join(
              schools.map((schoolData: any) => schoolData.schoolName),
              "\n"
            )
          : "*가입된 학교 없음"
      );
    }
  }, [schools]);

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
          "소셜 로그인": (
            <SnsId
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
