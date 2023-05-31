/**
 * @file Academy Pid Page Tab Item - BasicInfo
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
import Button from "components/button/Button";
import Input from "components/input/Input";

import useAPIv2 from "hooks/useAPIv2";
import { validate } from "functions/functions";
import { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {
  academyData: any;
  setAcademyData: React.Dispatch<any>;
};

const Academy = (props: Props) => {
  const { AcademyAPI } = useAPIv2();

  const [refresh, setRefresh] = useState<boolean>(false);

  const academyRef = useRef<{ [key: string]: string }>({});

  const onClickUpdateEmailHandler = async () => {
    let email: string | undefined = academyRef.current.email.trim();
    if (email === "") email = undefined;

    /* validate */
    if (email && !validate("email", email)) {
      alert("형식에 맞지 않습니다.");
      return;
    }

    try {
      const { academy } = await AcademyAPI.UAcademyEmail({
        params: {
          academyId: props.academyData.academyId,
        },
        data: {
          email,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.setAcademyData(academy);
      setRefresh(true);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const onClickUpdateTelHandler = async () => {
    let tel: string | undefined = academyRef.current.tel.trim();
    if (tel === "") tel = undefined;

    /* validate */
    if (tel && !validate("tel", tel)) {
      alert("형식에 맞지 않습니다.");
      return;
    }

    try {
      const { academy } = await AcademyAPI.UAcademyTel({
        params: {
          academyId: props.academyData.academyId,
        },
        data: {
          tel,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.setAcademyData(academy);
      setRefresh(true);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const onClickActivateHandler = async () => {
    if (!window.confirm("정말 활성화하시겠습니까?")) return;
    try {
      const { academy } = await AcademyAPI.UActivateAcademy({
        params: {
          academyId: props.academyData.academyId,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.setAcademyData(academy);
      setRefresh(true);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  const onClickInactivateHandler = async () => {
    if (
      !window.confirm(
        "정말 비활성화하시겠습니까? 아카데미 사용자 로그인이 제한됩니다."
      )
    )
      return;
    try {
      const { academy } = await AcademyAPI.UInactivateAcademy({
        params: {
          academyId: props.academyData.academyId,
        },
      });
      alert(SUCCESS_MESSAGE);
      props.setAcademyData(academy);
      setRefresh(true);
    } catch (err) {
      ALERT_ERROR(err);
    }
  };

  useEffect(() => {
    if (refresh) {
      setRefresh(false);
    }

    return () => {};
  }, [refresh]);

  return !refresh ? (
    <div>
      <div
        style={{
          marginTop: "24px",
          display: "flex",
          gap: "24px",
          flexDirection: "column",
        }}
      >
        <Input
          appearence="flat"
          label="관리자 ID"
          required
          defaultValue={props.academyData.adminId}
          disabled
        />
        <Input
          appearence="flat"
          label="관리자 이름"
          required
          defaultValue={props.academyData.adminName}
          disabled
        />

        <div style={{ display: "flex", gap: "12px", alignItems: "end" }}>
          <Input
            appearence="flat"
            label="이메일"
            placeholder="ex) asdfasdf@asdf.com"
            defaultValue={props.academyData.email}
            onChange={(e: any) => (academyRef.current.email = e.target.value)}
          />
          <Button type="ghost" onClick={onClickUpdateEmailHandler}>
            수정
          </Button>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "end" }}>
          <Input
            appearence="flat"
            label="전화번호"
            placeholder="ex) 000-0000-0000"
            defaultValue={props.academyData.tel}
            onChange={(e: any) => (academyRef.current.tel = e.target.value)}
          />
          <Button type="ghost" onClick={onClickUpdateTelHandler}>
            수정
          </Button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "24px",
          marginTop: "24px",
        }}
      >
        <Input
          appearence="flat"
          label="생성 날짜(UTC)"
          defaultValue={props.academyData.createdAt}
          disabled
        />
      </div>
      <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
        <Input
          appearence="flat"
          label="수정 날짜(UTC)"
          defaultValue={props.academyData.updatedAt}
          disabled
        />
      </div>
      <div style={{ marginTop: "24px" }}></div>
      {props.academyData.isActivated ? (
        <Button
          type={"ghost"}
          style={{
            borderRadius: "4px",
            height: "32px",
          }}
          onClick={onClickInactivateHandler}
        >
          {"비활성화"}
        </Button>
      ) : (
        <Button
          type={"ghost"}
          style={{
            borderRadius: "4px",
            height: "32px",
          }}
          onClick={onClickActivateHandler}
        >
          {"활성화"}
        </Button>
      )}
    </div>
  ) : (
    <></>
  );
};

export default Academy;
