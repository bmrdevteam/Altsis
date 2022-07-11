import React, { useEffect, useRef, useState } from "react";
import Form, {
  FormColumn,
  FormInput,
  FormRow,
  FormSubmit,
} from "../components/UI/form/Form";
import style from "../style/pages/login.module.scss";
import axios from "axios";
import Button from "../components/UI/button/Button";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const usernameRef = useRef<{ value: any }>();
  const passwordRef = useRef<{ value: any }>();
  const [errorMessage, setErrorMessage] = useState<string>("");

  //later hooks

  //hooks
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      axios
        .get("http://localhost:3000/api/test/test1")
        .then(function (response) {
          console.log(response);
        })
        .catch(function (error) {})
        .then(function () {});
    };
  }, []);

  // axios
  //   .post("/api/test/test1", {
  //     username: "",
  //     password: "",
  //   })
  //   .then(function (response) {
  //     console.log(response);
  //   })
  //   .catch(function (error) {
  //     console.log(error);
  //   });

  const onLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    axios
      .post("http://localhost:3000/api/user/register", {
        userId: usernameRef.current?.value,
        password: passwordRef.current?.value,
      })
      .then(function (response) {
        console.log(response);
      })
      .catch(function (error) {
        const errorMsg = error.response.data.errors;

        for (let i = 0; i < errorMsg.length; i++) {
          console.log(errorMsg[i]?.msg);
          console.log(errorMsg[i]?.param);
          setErrorMessage(errorMsg[i]?.msg);

          switch (errorMsg[i]?.msg) {
            case "409":
              //conflict
              break;
            case "ID length error":
              console.log(1);

              break;
            case "ID must be alphanumeric":
              console.log(2);

              break;
            case "Password length error":
              console.log(3);

              break;
            case "Password must contain one special character":
              console.log(4);

              break;

            default:
          }
        }
      });
  };

  return (
    <div className={style.section}>
      <div className={style.container}>
        <h1 className={style.title}>로그인</h1>
        <p className={style.error}>{errorMessage}</p>
        <Form handleSubmit={onLoginSubmit}>
          <FormColumn>
            <FormInput
              name="username"
              placeholder="username or email"
              handleChange={(e: React.FormEvent<HTMLInputElement>) => {
                console.log(usernameRef.current?.value);
              }}
              useRef={usernameRef}
              required={true}
            />
            <FormInput
              name="password"
              placeholder="password"
              valueType="password"
              required
            />
          </FormColumn>

          <FormSubmit placeholder="로그인" />
        </Form>
        <div style={{ height: "4px" }}></div>
        <Button
          type="ghost"
          handleClick={() => {
            navigate("/register", { replace: true });
          }}
        >
          회원가입
        </Button>
        {/* <Button
          type="ghost"
          handleClick={() => {
            window.open(
              "http://localhost:3000/api/user/google/login",
              "google로 로그인",
              "width=430,height=500,location=no,status=no,scrollbars=yes"
            );
          }}
        >
          google 로 로그인
        </Button> */}
        <div style={{ height: "4px" }}></div>

        <div
          id="g_id_onload"
          data-client_id="628425542095-4l9d49h85pd0oapq5596964os4ongkei.apps.googleusercontent.com"
          data-login_uri=""
          data-auto_prompt="false"
        ></div>
        <div
          className="g_id_signin"
          data-type="standard"
          data-size="large"
          data-theme="outline"
          data-text="sign_in_with"
          data-shape="rectangular"
          data-logo_alignment="left"
        ></div>
      </div>
    </div>
  );
};

export default Login;
