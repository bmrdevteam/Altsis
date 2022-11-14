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
import dummmyProfilePic from "assets/img/default_profile.png";
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

  const handleProfileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files) return;
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
        alert(error);
      });
  };

  return (
    <div className={style.settings_container}>
      <div className={style.container_title}>사용자 정보</div>
      <div>
        <label className={style.container_subtitle}>프로필 사진</label>
        <div className={style.profile_img}>
          <img
            src={currentUser.profile || dummmyProfilePic}
            alt="profile"
            width={128}
          />
        </div>
        <React.Fragment>
          <Button
            type={"ghost"}
            style={{
              borderRadius: "4px",
              height: "32px",
            }}
            onClick={handleProfileUploadButtonClick}
          >
            사진 업로드
          </Button>
          <input
            type="file"
            ref={fileInput}
            style={{ display: "none" }}
            onChange={handleProfileChange}
          />
        </React.Fragment>
        <Button
          type={"ghost"}
          style={{
            borderRadius: "4px",
            height: "32px",
          }}
          onClick={handleProfileDeleteButtonClick}
        >
          사진 삭제
        </Button>
      </div>
      <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
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
