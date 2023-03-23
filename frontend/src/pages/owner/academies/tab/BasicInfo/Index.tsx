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
import Button from "components/button/Button";
import Input from "components/input/Input";
import useApi from "hooks/useApi";

type Props = {
  academyData: any;
  setIsLoading: any;
};

const Academy = (props: Props) => {
  const { AcademyApi } = useApi();

  const [isActivated, setIsActivated] = useState<boolean>(
    props.academyData.isActivated
  );
  const [email, setEmail] = useState<string>(props.academyData.email);
  const [tel, setTel] = useState<any>(props.academyData.tel);

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
          label="email"
          defaultValue={email}
          onChange={(e: any) => setEmail(e.target.value)}
        />
        <Input
          label="tel"
          defaultValue={tel}
          onChange={(e: any) => setTel(e.target.value)}
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
          AcademyApi.UAcademy({
            academyId: props.academyData.academyId,
            data: {
              email,
              tel,
            },
          })
            .then((res) => {
              alert("성공적으로 처리되었습니다. 😘💌");
              props.setIsLoading(true);
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
            if (window.confirm("정말 비활성화하시겠습니까?")) {
              AcademyApi.UInactivateAcademy({
                academyId: props.academyData.academyId,
              })
                .then((res) => {
                  alert("성공적으로 처리되었습니다. 😘💌");
                  setIsActivated(false);
                })
                .catch((err) => {
                  alert(err.response.data.message);
                });
            }
          } else {
            if (window.confirm("정말 활성화하시겠습니까?")) {
              AcademyApi.UActivateAcademy({
                academyId: props.academyData.academyId,
              })
                .then((res) => {
                  alert("성공적으로 처리되었습니다. 😘💌");
                  setIsActivated(true);
                })
                .catch((err) => {
                  alert(err.response.data.message);
                });
            }
          }
        }}
      >
        {isActivated ? "비활성화" : "활성화"}
      </Button>
    </div>
  );
};

export default Academy;
