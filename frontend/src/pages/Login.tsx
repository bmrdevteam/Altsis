import React, { useRef } from "react";
import Form, {
  FormColumn,
  FormInput,
  FormRow,
  FormSubmit,
} from "../components/UI/form/Form";
import style from "../style/pages/login.module.scss";

const Login = () => {
  const usernameRef = useRef<{ value: any }>();

  console.log(usernameRef);
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
            <FormInput name="이름" placeholder="name" />
          </FormColumn>
          <FormColumn>
            <FormInput name="이메일" placeholder="email" />
            <FormInput name="sdf" placeholder="password" />
          </FormColumn>
          <FormSubmit placeholder="로그인" />
        </Form>
      </div>
    </div>
  );
};

export default Login;
