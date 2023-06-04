/**
 * @file Settings Page tab - UserSettings
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * - UserSettings Page
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
 */

import React, { useState, useRef, useEffect } from "react";

import Input from "components/input/Input";
import Button from "components/button/Button";
import Popup from "components/popup/Popup";
import { useAuth } from "contexts/authContext";

import style from "style/pages/settings/settings.module.scss";
import defaultProfilePic from "assets/img/default_profile.png";

import useDatabase from "hooks/useDatabase";
import { validate } from "functions/functions";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {};

const EmailEditPopup = (props: {
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { UserAPI } = useAPIv2();

  const { currentUser, setCurrentUser } = useAuth();

  const emailRef = useRef<string>("");

  useEffect(() => {
    if (currentUser._id) {
      emailRef.current = currentUser.email ?? "";
    }
    return () => {};
  }, [currentUser]);

  const updateHandler = async () => {
    try {
      if (emailRef.current !== "" && !validate("email", emailRef.current)) {
        return alert("이메일 형식에 맞지 않습니다.");
      }
      const { email } = await UserAPI.UUserEmail({
        params: { uid: currentUser._id },
        data: {
          email: emailRef.current !== "" ? emailRef.current : undefined,
        },
      });
      alert(SUCCESS_MESSAGE);
      setCurrentUser({ ...currentUser, email });
      props.setPopupActive(false);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  return (
    <Popup
      title="이메일 수정"
      setState={props.setPopupActive}
      closeBtn
      footer={
        <Button type="ghost" onClick={updateHandler}>
          수정
        </Button>
      }
    >
      <div style={{ width: "500px" }}>
        <Input
          appearence="flat"
          label="이메일"
          placeholder="이메일을 입력해주세요"
          type="string"
          onChange={(e: any) => {
            emailRef.current = e.target.value;
          }}
          defaultValue={currentUser.email}
        />
      </div>
    </Popup>
  );
};

const TelEditPopup = (props: {
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { UserAPI } = useAPIv2();

  const { currentUser, setCurrentUser } = useAuth();

  const telRef = useRef<string>("");

  useEffect(() => {
    if (currentUser._id) {
      telRef.current = currentUser.tel ?? "";
    }
    return () => {};
  }, [currentUser]);

  const updateHandler = async () => {
    try {
      if (telRef.current !== "" && !validate("tel", telRef.current)) {
        return alert("전화번호 형식에 맞지 않습니다.");
      }
      const { tel } = await UserAPI.UUserTel({
        params: { uid: currentUser._id },
        data: {
          tel: telRef.current !== "" ? telRef.current : undefined,
        },
      });
      alert(SUCCESS_MESSAGE);
      setCurrentUser({ ...currentUser, tel });
      props.setPopupActive(false);
    } catch (err: any) {
      ALERT_ERROR(err);
    }
  };

  return (
    <Popup
      title="전화번호 수정"
      setState={props.setPopupActive}
      closeBtn
      footer={
        <Button type="ghost" onClick={updateHandler}>
          수정
        </Button>
      }
    >
      <div style={{ width: "500px" }}>
        <Input
          appearence="flat"
          label="전화번호"
          placeholder="전화번호를 입력해주세요"
          type="string"
          onChange={(e: any) => {
            telRef.current = e.target.value;
          }}
          defaultValue={currentUser.tel}
        />
      </div>
    </Popup>
  );
};

const UserSettings = (props: Props) => {
  const { currentUser, setCurrentUser } = useAuth();
  const { UserAPI } = useAPIv2();

  /* popup Activattion */
  const [emailEditPopupActive, setEmailEditPopupActive] =
    useState<boolean>(false);
  const [telEditPopupActive, setTelEditPopupActive] = useState<boolean>(false);

  const fileInput = React.useRef<HTMLInputElement | null>(null);

  const handleProfileUploadButtonClick = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (fileInput.current) fileInput.current.click();
  };
  const correctForm = /(jpeg|jpg|webp|png)$/;

  const handleProfileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files?.length === 0) return;
    if (!e.target.files[0].type.match(correctForm)) {
      alert("지원되지 않는 파일 형식입니다.");
      return;
    }
    if (e.target.files[0].size > 2 * 1024 * 1024) {
      alert("크기가 2MB 이하인 사진만 등록할 수 있습니다.");
      return;
    }

    const formData = new FormData();
    formData.append("img", e.target.files[0]);

    try {
      const { profile } = await UserAPI.UUserProfile({ data: formData });
      setCurrentUser({ ...currentUser, profile });
    } catch (err: any) {
      alert("사진을 업로드할 수 없습니다");
    }
  };

  return (
    <>
      <div className={style.settings_container}>
        <div className={style.container_title}>사용자 정보</div>

        <div className={style.profile_upload}>
          <div className={style.profile_boxed}>
            <img
              src={currentUser?.profile || defaultProfilePic}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  currentUser?.profile?.replace("/thumb/", "/original/") ?? "";
              }}
              alt="profile"
            />
            <React.Fragment>
              <Button
                type={"ghost"}
                style={{
                  backgroundColor: "rgba(33,37,41,.64)",
                  color: "white",
                  position: "absolute",
                  bottom: "0",
                  height: "20%",
                  width: "100%",
                  border: "none",
                }}
                onClick={handleProfileUploadButtonClick}
              >
                변경
              </Button>
              <input
                type="file"
                ref={fileInput}
                style={{ display: "none" }}
                onChange={handleProfileChange}
              />
            </React.Fragment>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <Input
            label="이름"
            placeholder="이름"
            appearence="flat"
            style={{ fontSize: "14px" }}
            defaultValue={currentUser.userName}
            disabled
          />
          <Input
            label="아이디"
            placeholder="아이디"
            appearence="flat"
            style={{ fontSize: "14px" }}
            defaultValue={currentUser.userId}
            disabled
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "24px",
            alignItems: "flex-end",
          }}
        >
          <Input
            label="이메일"
            appearence="flat"
            style={{ fontSize: "14px" }}
            defaultValue={currentUser.email}
            disabled
          />
          <Button
            type="ghost"
            onClick={() => {
              setEmailEditPopupActive(true);
            }}
          >
            수정
          </Button>
        </div>
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "24px",
            alignItems: "flex-end",
          }}
        >
          <Input
            label="전화번호"
            appearence="flat"
            style={{ fontSize: "14px" }}
            defaultValue={currentUser.tel}
            disabled
          />
          <Button
            type="ghost"
            onClick={() => {
              setTelEditPopupActive(true);
            }}
          >
            수정
          </Button>
        </div>
        {/* <div style={{ marginTop: "12px" }}>
     <Textarea label="설명" placeholder="설명" />
   </div> */}
      </div>
      {emailEditPopupActive && (
        <EmailEditPopup setPopupActive={setEmailEditPopupActive} />
      )}
      {telEditPopupActive && (
        <TelEditPopup setPopupActive={setTelEditPopupActive} />
      )}
    </>
  );
};

export default UserSettings;
