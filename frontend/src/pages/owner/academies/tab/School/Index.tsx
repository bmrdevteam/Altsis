/**
 * @file Academy Pid Page Tab Item - School
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
import useApi from "hooks/useApi";

// components
import Tab from "components/tab/Tab";
import Button from "components/button/Button";
import Input from "components/input/Input";
import Table from "components/table/Table";
import Popup from "components/popup/Popup";

// tab elements
import Basic from "./tab/BasicInfo";
import Classroom from "./tab/Classroom";
import Subject from "./tab/Subject";

type Props = {
  academyId: string;
};

const School = (props: Props) => {
  const database = useDatabase();
  const { AcademyApi } = useApi();
  const [isLoading, setIsLoading] = useState(false);

  /* document list */
  const [documentList, setDocumentList] = useState<any>();
  const [doc, setDoc] = useState<any>();

  /* popup activation */
  const [editPopupActive, setEditPopupActive] = useState(false);
  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);

  /* document fields */
  const [schoolId, setSchoolId] = useState<string>();
  const [schoolName, setSchoolName] = useState<string>();

  async function getDocumentList() {
    const { documents } = await database.R({
      location: `academies/${props.academyId}/schools`,
    });
    return documents;
  }

  async function getDocument(id: string) {
    const result = await database.R({
      location: `academies/${props.academyId}/schools/${id}`,
    });
    return result;
  }

  async function addDocument() {
    const result = await database.C({
      location: `academies/${props.academyId}/schools`,
      data: {
        schoolId,
        schoolName,
      },
    });
    return result;
  }

  async function deleteDocument(id: string) {
    if (window.confirm("정말 삭제하시겠습니까?") === true) {
      const result = database.D({
        location: `academies/${props.academyId}/schools/${id}`,
      });
      return result;
    }
    return false;
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
    <div>
      <div style={{ marginTop: "24px" }}>
        <Button
          type={"ghost"}
          style={{
            borderRadius: "4px",
            height: "32px",
            margin: "24px 0",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
          onClick={() => {
            setAddPopupActive(true);
          }}
        >
          + 학교 추가
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
              text: "학교 ID",
              key: "schoolId",
              type: "string",
            },
            {
              text: "학교 이름",
              key: "schoolName",
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
                  .then((res) => {
                    if (res) {
                      setIsLoading(true);
                    }
                  })
                  .catch((err) => {
                    alert(err.response.data.message);
                    setIsLoading(true);
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
              "기본 정보": <Basic academy={props.academyId} schoolData={doc} />,
              classrooms: (
                <Classroom academy={props.academyId} schoolData={doc} />
              ),
              subjects: <Subject academy={props.academyId} schoolData={doc} />,
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
          <div>
            <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
              <Input
                appearence="flat"
                label="schoolId"
                required={true}
                onChange={(e: any) => {
                  setSchoolId(e.target.value);
                }}
                placeholder="2~20자의 영문 소문자와 숫자만 사용 가능합니다."
              />
            </div>

            <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
              <Input
                appearence="flat"
                label="schoolName"
                required={true}
                onChange={(e: any) => {
                  setSchoolName(e.target.value);
                }}
                placeholder="2~20자의 문자만 가능합니다."
              />
            </div>

            <Button
              type={"ghost"}
              onClick={() => {
                AcademyApi.CAcademyDocument({
                  academyId: props.academyId,
                  type: "schools",
                  data: {
                    schoolId,
                    schoolName,
                  },
                })
                  .then(() => {
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
          </div>
        </Popup>
      )}
    </div>
  );
};

export default School;
