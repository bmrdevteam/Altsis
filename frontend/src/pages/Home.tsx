import React from "react";
import Button from "../components/UI/button/Button";
import Form, { FormInput, FormSelect, FormSubmit } from "../components/UI/form/Form";
import Sidebar from "../components/layout/navbar/Sidebar";

type Props = {};

const Home = (props: Props) => {
  return (
    <div style={{backgroundColor:"rgb(250,252,254)",width:"100%",height:"100vh"}}>
      <Sidebar/>
      {/* <Button type="smooth" handleClick={()=>{console.log("sfd")}}>CLICK ME</Button> */}
    </div>
  );
};

export default Home;
