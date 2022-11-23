/**
 * @file Academy Pid Page Tab Item - Registration
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
import _ from "lodash";

type Props = {
  academy: string;
};

const Registration = (props: Props) => {
  const database = useDatabase();
  const [isLoading, setIsLoading] = useState(false);

  /* document list */
  const [documentList, setDocumentList] = useState<any>();
  const [doc, setDoc] = useState<any>();

  /* additional document list */
  const [schoolList, setSchoolList] = useState<any>();
  const [school, setSchool] = useState<any>();
  const [seasonList, setSeasonList] = useState<any>();
  const [season, setSeason] = useState<any>();
  const [userList, setUserList] = useState<any>();
  const [user, setUser] = useState<any>();

  /* popup activation */
  const [editPopupActive, setEditPopupActive] = useState(false);
  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);

  /* document fields */
  const [schoolId, setSchoolId] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const [term, setTerm] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [role, setRole] = useState<string>("");

  async function getDocumentList() {
    const { documents } = await database.R({
      location: `academies/${props.academy}/registrations?season=${season}`,
    });
    return documents;
  }

  async function getDocument(id: string) {
    const result = await database.R({
      location: `academies/${props.academy}/registrations/${id}`,
    });
    return result;
  }

  async function getSchoolList() {
    const { documents } = await database.R({
      location: `academies/${props.academy}/schools`,
    });
    return documents;
  }

  async function getSeasonList() {
    const { documents } = await database.R({
      location: `academies/${props.academy}/seasons?school=${school}`,
    });
    return documents;
  }

  async function getUserList() {
    const { documents } = await database.R({
      location: `academies/${props.academy}/users`,
    });
    return documents;
  }

  async function addDocument() {
    const result = await database.C({
      location: `academies/${props.academy}/registrations`,
      data: {
        season,
        userId,
        role,
      },
    });
    return result;
  }

  async function deleteDoc(id: string) {
    if (window.confirm("정말 삭제하시겠습니까?") === true) {
      const result = database.D({
        location: `academies/${props.academy}/registrations/${id}`,
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

  const seasons = () => {
    let result: { text: string; value: string }[] = [{ text: "", value: "" }];

    for (let i = 0; i < seasonList?.length; i++) {
      result.push({
        text: `${seasonList[i].year}(${seasonList[i].term})`,
        value: seasonList[i]._id,
      });
    }

    return result;
  };

  const users = () => {
    let result: { text: string; value: string }[] = [{ text: "", value: "" }];

    for (let i = 0; i < userList?.length; i++) {
      result.push({
        text: `${userList[i].userName}(${userList[i].userId})`,
        value: userList[i].userId,
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
    return () => {};
  }, []);

  useEffect(() => {
    if (!school) {
      setSeasonList([]);
      setDocumentList([]);
    } else {
      getSeasonList()
        .then((res) => {
          setSeasonList(res);
        })
        .catch(() => {
          alert("faled to load data");
        });
    }
    return () => {};
  }, [school]);

  useEffect(() => {
    if (!season) {
      setDocumentList([]);
    } else {
      getDocumentList()
        .then((res) => {
          setDocumentList(res);
        })
        .catch(() => {
          alert("faled to load data");
        });
    }

    return () => {};
  }, [season]);

  return (
    <div style={{ marginTop: "24px" }}>
      <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
        <Select
          style={{ minHeight: "30px" }}
          required
          label={"학교 선택"}
          options={!isLoading ? schools() : []}
          setValue={setSchool}
          appearence={"flat"}
        />

        <Select
          style={{ minHeight: "30px" }}
          required
          label={"시즌 선택"}
          options={!isLoading ? seasons() : []}
          setValue={setSeason}
          appearence={"flat"}
        />
      </div>

      <Button
        type={"ghost"}
        style={{
          borderRadius: "4px",
          height: "32px",
          margin: "24px 0",
          boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
        }}
        onClick={async () => {
          if (school && season) {
            const schoolDoc = _.find(schoolList, { _id: school });
            const seasonDoc = _.find(seasonList, { _id: season });
            setSchoolId(schoolDoc.schoolId);
            setSchoolName(schoolDoc.schoolName);
            setYear(seasonDoc.year);
            setTerm(seasonDoc.term);
            getUserList()
              .then((res) => {
                setUserList(res);
                setAddPopupActive(true);
              })
              .catch((err) => {
                alert(err.response.data.message);
              });
          }
        }}
      >
        + 등록 생성
      </Button>
      <div style={{ marginTop: "24px" }} />

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
            text: "역할",
            key: "role",
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
              "기본 정보": (
                <Basic academy={props.academy} registrationData={doc} />
              ),
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
            <Input
              appearence="flat"
              label="학교 ID"
              required={true}
              disabled={true}
              defaultValue={schoolId}
            />
            <Input
              appearence="flat"
              label="학교 이름"
              required={true}
              disabled={true}
              defaultValue={schoolName}
            />
            <Input
              appearence="flat"
              label="학년도"
              required={true}
              disabled={true}
              defaultValue={year}
            />
            <Input
              appearence="flat"
              label="학기"
              required={true}
              disabled={true}
              defaultValue={term}
            />
          </div>

          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Select
              style={{ minHeight: "30px" }}
              required
              label={"사용자 선택"}
              options={!isLoading ? users() : []}
              setValue={setUserId}
              appearence={"flat"}
            />
          </div>

          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Select
              style={{ minHeight: "30px" }}
              label="role"
              required
              options={[
                { text: "member", value: "member" },
                { text: "manager", value: "manager" },
              ]}
              setValue={setRole}
              appearence={"flat"}
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

export default Registration;
