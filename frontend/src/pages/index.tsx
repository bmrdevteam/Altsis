import React from "react";
import Form, { FormInput, FormSelect, FormSubmit } from "../components/UI/form/Form";

type Props = {};

const Home = (props: Props) => {
  return (
    <div>
      <Form handleSubmit={(e:React.FormEvent<HTMLFormElement>)=>{
        e.preventDefault()
        console.log("submited")
      }}>
        <FormInput name="이세찬" placeholder="이름을 입력하시오" required={true} ></FormInput>
        <FormSubmit/>

      </Form>
    </div>
  );
};

export default Home;
