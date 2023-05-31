/**
 * @file Academy Add Popup
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

import { useEffect, useRef, useState } from "react";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

// components
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import Input from "components/input/Input";
import Textarea from "components/textarea/Textarea";
import { validate } from "functions/functions";
import { TAcademy } from "types/academies";
import { TAdmin } from "types/users";
import Callout from "components/callout/Callout";

type Props = {
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

const getInfoText = (academy: TAcademy, admin: TAdmin) => {
  const info = new Map<String, String>([
    ["아카데미 ID", academy.academyId],
    ["아카데미 이름", academy.academyName],
    ["관리자 ID", academy.adminId],
    ["관리자 이름", academy.adminName],
    ["관리자 비밀번호", admin.password],
  ]);
  if (academy.email) {
    info.set("이메일", academy.email);
  }
  if (academy.tel) {
    info.set("전화번호", academy.tel);
  }

  return JSON.stringify(Object.fromEntries(info), null, 2);
};

const Academies = (props: Props) => {
  const { AcademyAPI } = useAPIv2();
  const academyRef = useRef<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [resPopupActive, setResPopupActive] = useState<boolean>(false);
  const [resAcademy, setResAcademy] = useState<TAcademy | undefined>();
  const [resAdmin, setResAdmin] = useState<TAdmin | undefined>();

  useEffect(() => {
    console.log("Popup is loaded");

    return () => {};
  }, []);

  const handleCreateAcademy = async () => {
    /* validate */

    // validate required fields
    for (let val of [
      { field: "academyId", text1: "아카데미 ID를", text2: "아카데미 ID가" },
      {
        field: "academyName",
        text1: "아카데미 이름을",
        text2: "아카데미 이름이",
      },
      { field: "adminId", text1: "관리자 ID를", text2: "관리자 ID가" },
      { field: "adminName", text1: "관리자 이름을", text2: "관리자 이름이" },
    ]) {
      if (!academyRef.current[val.field]) {
        alert(val.text1 + " 입력해주세요.");
        return;
      }
      if (!validate(val.field, academyRef.current[val.field])) {
        alert(val.text2 + " 형식에 맞지 않습니다.");
        return;
      }
    }

    // validate optional fields
    for (let val of [
      { field: "email", text2: "이메일이" },
      { field: "tel", text2: "전화번호가" },
    ]) {
      if (
        academyRef.current[val.field] &&
        !validate(val.field, academyRef.current[val.field])
      ) {
        alert(val.text2 + " 형식에 맞지 않습니다.");
        return;
      }
    }

    try {
      const { academy, admin } = await AcademyAPI.CAcademy({
        data: {
          academyId: academyRef.current.academyId,
          academyName: academyRef.current.academyName,
          adminId: academyRef.current.adminId,
          adminName: academyRef.current.adminName,
          email:
            academyRef.current.email && academyRef.current.email !== ""
              ? academyRef.current.email
              : undefined,
          tel:
            academyRef.current.tel && academyRef.current.tel !== ""
              ? academyRef.current.tel
              : undefined,
        },
      });

      alert(SUCCESS_MESSAGE);

      setResAcademy(academy);
      setResAdmin(admin);

      setResPopupActive(true);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  return (
    <>
      <Popup
        setState={props.setPopupActive}
        closeBtn
        title={"아카데미 생성"}
        contentScroll
        style={{ width: "360px" }}
        footer={
          <Button
            type={"ghost"}
            disabled={isLoading}
            onClick={() => {
              setIsLoading(true);
              handleCreateAcademy().finally(() => setIsLoading(false));
            }}
            style={{
              borderRadius: "4px",
              height: "32px",
              boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
            }}
          >
            생성
          </Button>
        }
      >
        <div style={{ marginTop: "24px" }}>
          <div
            style={{ display: "flex", gap: "12px", flexDirection: "column" }}
          >
            <Input
              appearence="flat"
              label="아카데미 ID"
              required={true}
              onChange={(e: any) => {
                academyRef.current.academyId = e.target.value;
              }}
              placeholder="알파벳과 숫자로 이루어진 2~20자의 문자열"
            />
            <Input
              appearence="flat"
              label="아카데미 이름"
              required={true}
              onChange={(e: any) => {
                academyRef.current.academyName = e.target.value;
              }}
              placeholder="알파벳, 숫자와 한글로 이루어진 2~20자의 문자열"
            />
            <Input
              appearence="flat"
              label="관리자 ID"
              required={true}
              onChange={(e: any) => {
                academyRef.current.adminId = e.target.value;
              }}
              placeholder="알파벳과 숫자로 이루어진 4~20자의 문자열"
            />
            <Input
              appearence="flat"
              label="관리자 이름"
              required={true}
              onChange={(e: any) => {
                academyRef.current.adminName = e.target.value;
              }}
              placeholder="알파벳, 숫자와 한글로 이루어진 2~20자의 문자열"
            />
            <Input
              appearence="flat"
              label="email"
              onChange={(e: any) => {
                academyRef.current.email = e.target.value;
              }}
              placeholder="ex) asdfasdf@asdf.com"
            />
            <Input
              appearence="flat"
              label="tel"
              onChange={(e: any) => {
                academyRef.current.tel = e.target.value;
              }}
              placeholder="ex) 000-0000-0000"
            />
          </div>
        </div>
      </Popup>
      {resPopupActive && resAcademy && resAdmin && (
        <Popup
          setState={() => {
            props.setPopupActive(false);
            props.setIsLoading(true);
          }}
          style={{ maxWidth: "1000px", width: "100%" }}
          closeBtn
          title={"아카데미 생성이 완료되었습니다."}
        >
          <Callout
            type={"warning"}
            showIcon
            title={"이 창을 닫은 후에는 관리자 비밀번호를 확인할 수 없습니다."}
          />
          <div style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", gap: "24px" }}>
              <Textarea
                rows={10}
                label="결과"
                placeholder="결과"
                defaultValue={getInfoText(resAcademy, resAdmin)}
              />
            </div>
          </div>
          <div style={{ height: "24px" }}></div>
        </Popup>
      )}
    </>
  );
};

export default Academies;
