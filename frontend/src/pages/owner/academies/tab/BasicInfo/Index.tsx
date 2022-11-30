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

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useDatabase from "hooks/useDatabase";

// components
import Button from "components/button/Button";
import Input from "components/input/Input";

type Props = {
  academyData: any;
};

const Academy = (props: Props) => {
  const database = useDatabase();
  const navigate = useNavigate();

  const [isActivated, setIsActivated] = useState<boolean>(
    props.academyData.isActivated
  );
  const [email, setEmail] = useState<string>(props.academyData.email);
  const [tel, setTel] = useState<any>(props.academyData.tel);

  async function updateAcademy() {
    const result = await database.U({
      location: `academies/${props.academyData._id}`,
      data: {
        email,
        tel,
      },
    });
    return result;
  }

  async function activateAcademy() {
    if (window.confirm("정말 활성화하시겠습니까?") === true) {
      // 확인
      const result = await database.C({
        location: `academies/${props.academyData._id}/activate`,
        data: {},
      });
      return result;
    }
    // 취소
    return false;
  }

  async function inactivateAcademy() {
    if (window.confirm("정말 비활성화하시겠습니까?") === true) {
      // 확인
      const result = await database.C({
        location: `academies/${props.academyData._id}/inactivate`,
        data: {},
      });
      return result;
    }
    // 취소
    return false;
  }

  async function deleteAcademy() {
    if (window.confirm("정말 삭제하시겠습니까?") === true) {
      //확인
      // const result = await database.D({
      //   location: `academies/${props.academy?._id}`,
      // });
      return true;
    } else {
      //취소

      return false;
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "24px",
          marginTop: "24px",
        }}
      >
        <Input
          label="아카데미 ID"
          defaultValue={props.academyData.academyId}
          required
          disabled
        />
        <Input
          label="아카데미 이름"
          defaultValue={props.academyData.academyName}
          required
          disabled
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "24px",
          marginTop: "24px",
        }}
      >
        <Input
          label="email"
          defaultValue={email}
          onChange={(e: any) => {
            setEmail(e.target.value);
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: "24px",
          marginTop: "24px",
        }}
      >
        <Input
          label="tel"
          defaultValue={tel}
          onChange={(e: any) => {
            setTel(e.target.value);
          }}
        />
      </div>
      <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
        <Input
          appearence="flat"
          label="생성 날짜"
          defaultValue={props.academyData.createdAt}
          disabled
        />
      </div>
      <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
        <Input
          appearence="flat"
          label="수정 날짜"
          defaultValue={props.academyData.updatedAt}
          disabled
        />
      </div>

      <Button
        type={"ghost"}
        style={{
          borderRadius: "4px",
          height: "32px",
          marginTop: "24px",
        }}
        onClick={() => {
          updateAcademy()
            .then((res) => {
              alert("success");
            })
            .catch((err) => {
              alert(err.response.data.message);
            });
        }}
      >
        수정하기
      </Button>
      <div style={{ marginTop: "12px" }}></div>
      <Button
        type={"ghost"}
        style={{
          borderRadius: "4px",
          height: "32px",
        }}
        onClick={() => {
          if (isActivated) {
            inactivateAcademy()
              .then((res) => {
                alert("success");
                setIsActivated(false);
              })
              .catch((err) => {
                alert(err.response.data.message);
              });
          } else {
            activateAcademy()
              .then((res) => {
                alert("success");
                setIsActivated(true);
              })
              .catch((err) => {
                alert(err.response.data.message);
              });
          }
        }}
      >
        {isActivated ? "비활성화" : "활성화"}
      </Button>
    </div>
  );
};

export default Academy;
