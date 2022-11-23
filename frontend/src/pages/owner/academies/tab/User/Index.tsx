/**
 * @file Academy Pid Page Tab Item - User
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

import { useEffect, useState } from "react";
import useDatabase from "hooks/useDatabase";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Table from "components/table/Table";
import Tab from "components/tab/Tab";
import Popup from "components/popup/Popup";
import Select from "components/select/Select";

// tab elements
import Basic from "./tab/Basic";

type Props = {
  academy: string;
};

const User = (props: Props) => {
  const database = useDatabase();
  const [isLoading, setIsLoading] = useState(false);

  /* document list */
  const [documentList, setDocumentList] = useState<any>();
  const [doc, setDoc] = useState<any>();

  /* popup activation */
  const [editPopupActive, setEditPopupActive] = useState(false);
  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);

  /* document fields */
  const [auth, setAuth] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [email, setEmail] = useState<any>(undefined);
  const [tel, setTel] = useState<any>(undefined);

  async function getDocumentList() {
    const { documents } = await database.R({
      location: `academies/${props.academy}/users`,
    });
    return documents;
  }

  async function getDocument(id: string) {
    const result = await database.R({
      location: `academies/${props.academy}/users/${id}`,
    });
    return result;
  }

  async function addDocument() {
    const result = await database.C({
      location: `academies/${props.academy}/users`,
      data: {
        auth,
        userId,
        userName,
        password,
        tel,
        email,
      },
    });
    return result;
  }

  async function deleteDoc(id: string) {
    if (window.confirm("정말 삭제하시겠습니까?") === true) {
      const result = database.D({
        location: `academies/${props.academy}/users/${id}`,
      });
      return result;
    } else {
      return false;
    }
  }

  useEffect(() => {
    getDocumentList()
      .then((res) => {
        setDocumentList(res);
      })
      .catch(() => {
        alert("failed to load data");
      });
    setIsLoading(false);
    return () => {};
  }, [isLoading]);

  return (
    <div style={{ marginTop: "24px" }}>
      <Button
        type={"ghost"}
        style={{
          borderRadius: "4px",
          height: "32px",
          margin: "24px 0",
          boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
        }}
        onClick={async () => {
          setAddPopupActive(true);
        }}
      >
        + 사용자 생성
      </Button>
      <Table
        filter
        data={!isLoading ? documentList : []}
        header={[
          {
            text: "ID",
            key: "",
            type: "index",
            width: "48px",
            align: "center",
          },
          {
            text: "auth",
            key: "auth",
            type: "string",
          },
          {
            text: "사용자 ID",
            key: "userId",
            type: "string",
          },
          {
            text: "사용자 이름",
            key: "userName",
            type: "string",
          },

          {
            text: "자세히",
            key: "_id",
            type: "button",
            onClick: (e: any) => {
              getDocument(e.target.dataset.value).then((res) => {
                setDoc(res);
                setEditPopupActive(true);
              });
            },
            width: "80px",
            align: "center",
          },
          {
            text: "삭제",
            key: "_id",
            type: "button",
            onClick: (e: any) => {
              deleteDoc(e.target.dataset.value)
                .then((res) => {
                  if (res) {
                    setIsLoading(true);
                  }
                })
                .catch((err) => {
                  alert(err.response.data.message);
                });
            },
            width: "80px",
            align: "center",
          },
        ]}
      />
      {editPopupActive && (
        <Popup
          closeBtn
          title="Edit Document"
          setState={setEditPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
          contentScroll
        >
          <Tab
            dontUsePaths
            items={{
              "기본 정보": <Basic academy={props.academy} userData={doc} />,
            }}
            align={"flex-start"}
          />
        </Popup>
      )}
      {addPopupActive && (
        <Popup
          setState={setAddPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
          closeBtn
          title={"Creaet Document"}
        >
          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Select
              style={{ minHeight: "30px" }}
              label="학교"
              required
              options={[
                { text: "member", value: "member" },
                { text: "manager", value: "manager" },
              ]}
              setValue={setAuth}
              appearence={"flat"}
            />
          </div>

          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Input
              appearence="flat"
              label="userId"
              required={true}
              onChange={(e: any) => {
                setUserId(e.target.value);
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Input
              appearence="flat"
              label="userName"
              required={true}
              onChange={(e: any) => {
                setUserName(e.target.value);
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Input
              appearence="flat"
              label="password"
              required={true}
              onChange={(e: any) => {
                setPassword(e.target.value);
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Input
              appearence="flat"
              label="email"
              onChange={(e: any) => {
                setEmail(e.target.value);
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Input
              appearence="flat"
              label="tel"
              onChange={(e: any) => {
                setTel(e.target.value);
              }}
            />
          </div>

          <Button
            type={"ghost"}
            onClick={() => {
              addDocument()
                .then((res) => {
                  setAddPopupActive(false);
                  setIsLoading(true);
                })
                .catch((err) => {
                  alert(err.response.data.message);
                });
            }}
            style={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              marginTop: "24px",
            }}
          >
            생성
          </Button>
        </Popup>
      )}
    </div>
  );
};

export default User;
