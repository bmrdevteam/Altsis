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

// hooks
import useDatabase from "hooks/useDatabase";

// components
import Button from "components/button/Button";
import Table from "components/table/Table";
import Tab from "components/tab/Tab";
import Popup from "components/popup/Popup";
import Select from "components/select/Select";

// popup/tab elements
import Basic from "./tab/Basic";
import Add from "./tab/Add";

import _ from "lodash";

type Props = {
  academyId: string;
};

const User = (props: Props) => {
  const database = useDatabase();
  const [isLoading, setIsLoading] = useState(true);

  /* document list */
  const [documentList, setDocumentList] = useState<any>();
  const [doc, setDoc] = useState<any>();

  /* additional document list */
  const [schoolList, setSchoolList] = useState<any>();
  const [school, setSchool] = useState<any>();
  const [schoolId, setSchoolId] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");

  /* popup activation */
  const [editPopupActive, setEditPopupActive] = useState(false);
  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);

  async function getDocumentList() {
    const { users } = await database.R({
      location: `academies/${props.academyId}/users?${
        school ? `schools.school=${school}` : `no-school=true`
      }`,
    });
    return users;
  }

  async function getDocument(id: string) {
    const result = await database.R({
      location: `academies/${props.academyId}/users/${id}`,
    });
    return result;
  }

  async function getSchoolList() {
    const { documents } = await database.R({
      location: `academies/${props.academyId}/schools`,
    });
    return documents;
  }

  async function deleteDocument(id: string) {
    if (window.confirm("정말 삭제하시겠습니까?") === true) {
      const result = database.D({
        location: `academies/${props.academyId}/users/${id}`,
      });
      return result;
    } else {
      return false;
    }
  }

  const schools = () => {
    let result: { text: string; value: string }[] = [{ text: "", value: "" }];

    for (let i = 0; i < schoolList?.length; i++) {
      result.push({
        text: `${schoolList[i].schoolName}(${schoolList[i].schoolId})`,
        value: schoolList[i]._id,
      });
    }

    return result;
  };

  useEffect(() => {
    getSchoolList()
      .then((res) => {
        setSchoolList(res);
      })
      .catch(() => {
        alert("failed to load data");
      });
    setIsLoading(false);
    return () => {};
  }, []);

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
  }, [school, addPopupActive, editPopupActive]);

  return (
    <>
      <div style={{ marginTop: "24px" }}>
        <Select
          style={{ minHeight: "30px" }}
          required
          label={"학교 선택"}
          options={!isLoading ? schools() : [{ text: "", value: "" }]}
          setValue={setSchool}
          appearence={"flat"}
        />

        <Button
          type={"ghost"}
          style={{
            borderRadius: "4px",
            height: "32px",
            margin: "24px 0",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
          onClick={async () => {
            const schoolDoc = _.find(schoolList, { _id: school });
            setSchoolId(schoolDoc?.schoolId);
            setSchoolName(schoolDoc?.schoolName);
            setAddPopupActive(true);
          }}
        >
          + 사용자 생성
        </Button>
        <Table
          type="object-array"
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
                getDocument(e._id).then((res) => {
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
                deleteDocument(e._id)
                  .then(() => {
                    getDocumentList().then((res) => {
                      setDocumentList(res);
                      setAddPopupActive(false);
                      alert("success");
                    });
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
      </div>
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
              "기본 정보": <Basic academy={props.academyId} userData={doc} />,
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
          title="Creaet Document"
        >
          <Add
            academyId={props.academyId}
            school={school}
            schoolId={schoolId}
            schoolName={schoolName}
          />
        </Popup>
      )}
    </>
  );
};

export default User;
