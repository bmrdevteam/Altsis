import React, { useEffect, useRef } from "react";
import Form, {
  FormColumn,
  FormInput,
  FormRow,
  FormSubmit,
} from "../components/UI/form/Form";
import style from "../style/pages/login.module.scss";
import axios from "axios";

const Login = () => {
  const usernameRef = useRef<{ value: any }>();

  //later hooks

  useEffect(() => {
    return () => {
      fetch("/api/test/test1")
        .then((response) => response.json())
        .then((data) => console.log(data));
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


  return (
    <div className={style.section}>
      <div className={style.container}>
        <h1 className={style.title}>로그인</h1>
        <Form
          handleSubmit={(e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            return console.log("s");
          }}
        >
          <FormColumn>
            <FormInput
              name="username"
              placeholder="username"
              handleChange={(e: React.FormEvent<HTMLInputElement>) => {
                console.log(usernameRef.current?.value);
              }}
              useRef={usernameRef}
              required={true}
            />
            <FormInput name="이름" placeholder="name" required />
          </FormColumn>
          <FormColumn>
            <FormInput
              name="이메일"
              placeholder="email"
              valueType="email"
              required
            />
            <FormInput
              name="패스워드"
              placeholder="password"
              valueType="password"
              required
            />
          </FormColumn>
          <FormSubmit placeholder="로그인" />
        </Form>
      </div>
    </div>
  );
};

export default Login;
