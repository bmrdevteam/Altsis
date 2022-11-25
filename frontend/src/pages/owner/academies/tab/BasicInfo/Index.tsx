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
  academy?: any;
};

const Academy = (props: Props) => {
  const database = useDatabase();
  const navigate = useNavigate();

  const [email, setEmail] = useState<any>();
  const [tel, setTel] = useState<any>();

  async function updateAcademy() {
    const result = await database.U({
      location: `academies/${props.academy?._id}`,
      data: {
        email,
        tel,
      },
    });
    return result;
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
          defaultValue={props.academy?.academyId}
          required
          disabled
        />
        <Input
          label="아카데미 이름"
          defaultValue={props.academy?.academyName}
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
          defaultValue={props.academy?.email}
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
          defaultValue={props.academy?.tel}
          onChange={(e: any) => {
            setTel(e.target.value);
          }}
        />
      </div>
      <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
        <Input
          appearence="flat"
          label="생성 날짜"
          defaultValue={props.academy?.createdAt}
          disabled
        />
      </div>
      <div style={{ display: "flex", gap: "24px", marginTop: "24px" }}>
        <Input
          appearence="flat"
          label="수정 날짜"
          defaultValue={props.academy?.updatedAt}
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
          deleteAcademy()
            .then((res) => {
              if (res) navigate("/owner/academies");
            })
            .catch((err) => {
              alert(err.response.data.message);
            });
        }}
        disabled={true}
      >
        삭제하기
      </Button>
    </div>
  );
};

export default Academy;
