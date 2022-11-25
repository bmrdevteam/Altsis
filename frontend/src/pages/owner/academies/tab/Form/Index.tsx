/**
 * @file Academy Pid Page Tab Item - Form
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
import { useNavigate } from "react-router-dom";
import useDatabase from "hooks/useDatabase";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";
import Popup from "components/popup/Popup";
import Table from "components/table/Table";

type Props = {
  academy: string;
};

const Form = (props: Props) => {
  const navigate = useNavigate();
  const database = useDatabase();
  const [isLoading, setIsLoading] = useState(false);

  /* document list */
  const [documentList, setDocumentList] = useState<any>();

  /* popup activation */
  const [editPopupActive, setEditPopupActive] = useState<boolean>(false);
  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);

  /* document fields */
  const [field1, setField1] = useState<string>("");

  async function getDocumentList() {
    const { documents } = await database.R({
      location: `academies/${props.academy}/forms`,
    });
    return documents;
  }

  async function getDocument(id: string) {
    const result = await database.R({
      location: `academies/${props.academy}/forms/${id}`,
    });
    return result;
  }

  async function addDocument() {
    const result = await database.C({
      location: `academies/${props.academy}/forms`,
      data: {
        field1,
      },
    });
    return result;
  }

  async function deleteDoc(id: string) {
    if (window.confirm("정말 삭제하시겠습니까?") === true) {
      const result = database.D({
        location: `academies/${props.academy}/forms/${id}`,
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
        + 양식 생성
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
            text: "구분",
            key: "type",
            type: "string",
          },
          {
            text: "제목",
            key: "title",
            type: "string",
          },
          {
            text: "작성자",
            key: "userName",
            type: "string",
          },
          {
            text: "자세히",
            key: "_id",
            type: "button",
            onClick: (e: any) => {
              navigate(`${e.target.dataset.value}`);
            },
            width: "80px",
            align: "center",
          },
        ]}
      />
      {editPopupActive && (
        <Popup
          closeBtn
          title="폼 정보"
          setState={setEditPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
          contentScroll
        >
          <div>임시</div>
        </Popup>
      )}
      {addPopupActive && (
        <Popup
          setState={setAddPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
          closeBtn
          title={"도큐먼트 생성"}
        >
          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            <Input
              appearence="flat"
              label="term"
              required={true}
              onChange={(e: any) => {
                setField1(e.target.value);
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

export default Form;
