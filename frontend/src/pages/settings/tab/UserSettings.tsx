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

import React from "react";
import Divider from "../../../components/divider/Divider";
import Input from "../../../components/input/Input";
import Textarea from "../../../components/textarea/Textarea";
import { useAuth } from "../../../contexts/authContext";
import style from "../../../style/pages/settings/settings.module.scss";
import defaultProfilePic from "assets/img/default_profile.png";
import Button from "components/button/Button";
import useDatabase from "../../../hooks/useDatabase";

type Props = {};

const UserSettings = (props: Props) => {
  const { currentUser, updateUserProfile, deleteUserProfile } = useAuth();
  const database = useDatabase();

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

    await database
      .C({
        location: "users/profile",
        data: formData,
      })
      .then((res) => {
        updateUserProfile(res?.data.profile);
      })
      .catch((error) => {
        alert(error);
      });
  };

  const handleProfileDeleteButtonClick = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!currentUser.profile) return alert("No Profile!");

    await database
      .D({
        location: "users/profile",
      })
      .then((res) => {
        deleteUserProfile("");
      })
      .catch((error) => {
        alert(error.message);
      });
  };

  return (
    <div className={style.settings_container}>
      <div className={style.container_title}>사용자 정보</div>

      <div className={style.profile_upload}>
        <div className={style.profile_boxed}>
          <img
            src={currentUser.profile || defaultProfilePic}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = currentUser?.profile.replace(
                "/thumb/",
                "/original/"
              );
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
      <div style={{ marginTop: "12px" }}>
        <Textarea label="설명" placeholder="설명" />
      </div>
    </div>
  );
};

export default UserSettings;
