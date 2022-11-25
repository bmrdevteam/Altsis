/**
 * @file Academy Page
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

import style from "style/pages/owner/academy.module.scss";

// NavigationLinks component
import NavigationLinks from "components/navigationLinks/NavigationLinks";

// components
import Button from "components/button/Button";
import Divider from "components/divider/Divider";
import Table from "components/table/Table";
import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Textarea from "components/textarea/Textarea";

type Props = {};

const Academies = (props: Props) => {
  const navigate = useNavigate();
  const database = useDatabase();

  /* document list */
  const [documentList, setDocumentList] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* popup activation */
  const [addPopupActive, setAddPopupActive] = useState<boolean>(false);
  const [addResultPopupActive, setAddResultPopupActive] =
    useState<boolean>(false);

  /* document fields */
  const [academyId, setAcademyId] = useState<string>();
  const [academyName, setAcademyName] = useState<string>();
  const [adminId, setAdminId] = useState<string>();
  const [adminName, setAdminName] = useState<string>();
  const [email, setEmail] = useState<string>();
  const [tel, setTel] = useState<string>();
  const [adminPassword, setAdminPassword] = useState<string>();

  async function getDocumentList() {
    const { academies } = await database.R({ location: "academies" });
    setDocumentList(academies);
  }

  async function addDocument() {
    const result = await database.C({
      location: `academies`,
      data: {
        academyId,
        academyName,
        adminId,
        adminName,
        email,
        tel,
      },
    });
    return result;
  }

  const getDocumentString = () => {
    let info = `아카데미 ID: ${academyId}\n아카데미 이름: ${academyName}\n관리자 ID: ${adminId}\n관리자 이름: ${adminName}\n관리자 비밀번호: ${adminPassword}`;
    if (email) info += `\nemail:${email}`;
    if (tel) info += `\ntel:${tel}`;
    return info;
  };

  useEffect(() => {
    getDocumentList().then(() => {
      setIsLoading(false);
    });
    return () => {};
  }, [isLoading]);

  return (
    <div className={style.section}>
      <NavigationLinks />
      <div style={{ display: "flex", gap: "24px" }}>
        <div style={{ flex: "1 1 0" }}>
          <div className={style.title}>아카데미 목록</div>
          <div className={style.description}>description...</div>
        </div>
      </div>
      <Divider />
      <Button
        type={"ghost"}
        style={{
          borderRadius: "4px",
          height: "32px",
          boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
        }}
        onClick={() => {
          setAddPopupActive(true);
        }}
      >
        + 아카데미 생성
      </Button>
      <div style={{ marginTop: "24px" }}>
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
              text: "아카데미 ID",
              key: "academyId",
              type: "string",
            },
            {
              text: "아카데미 이름",
              key: "academyName",
              type: "string",
            },
            {
              text: "관리자",
              key: "adminName",
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
      </div>
      {addPopupActive && (
        <Popup
          setState={setAddPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
          closeBtn
          title={"도큐먼트 생성"}
        >
          <div style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", gap: "24px" }}>
              <Input
                appearence="flat"
                label="아카데미 ID"
                required={true}
                onChange={(e: any) => {
                  setAcademyId(e.target.value);
                }}
              />
              <Input
                appearence="flat"
                label="아카데미 이름"
                required={true}
                onChange={(e: any) => {
                  setAcademyName(e.target.value);
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
              <Input
                appearence="flat"
                label="관리자 ID"
                required={true}
                onChange={(e: any) => {
                  setAdminId(e.target.value);
                }}
              />
              <Input
                appearence="flat"
                label="관리자 이름"
                required={true}
                onChange={(e: any) => {
                  setAdminName(e.target.value);
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

            <div style={{ height: "24px" }}></div>
            <Button
              type={"ghost"}
              disableOnclick
              onClick={() => {
                addDocument().then((res) => {
                  setAddPopupActive(false);
                  setAdminPassword(res?.data.adminPassword);
                  setAddResultPopupActive(true);
                });
              }}
              style={{
                borderRadius: "4px",
                height: "32px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              }}
            >
              생성
            </Button>
          </div>
        </Popup>
      )}
      {addResultPopupActive && (
        <Popup
          setState={setAddResultPopupActive}
          style={{ borderRadius: "8px", maxWidth: "1000px", width: "100%" }}
          closeBtn
          title={"아카데미 생성이 완료되었습니다."}
        >
          <div style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", gap: "24px" }}>
              <Textarea
                label="결과"
                placeholder="결과"
                defaultValue={getDocumentString()}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
            이 창을 닫은 후에는 관리자 비밀번호를 확인할 수 없습니다.
          </div>
          <div style={{ height: "24px" }}></div>
          <Button
            type={"ghost"}
            disableOnclick
            onClick={() => {
              setAddResultPopupActive(false);
              setIsLoading(true);
            }}
            style={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            }}
          >
            닫기
          </Button>
        </Popup>
      )}
    </div>
  );
};

export default Academies;
