import React from "react";
import { useNavigate } from "react-router-dom";

type Props = {};

const Http404 = (props: Props) => {
  const navigate = useNavigate();
  return (
    <div
      className="page_container"
      style={{
        flex: "1 1 0",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        flexDirection: "column",
        fontSize: "16px",
      }}
    >
      <strong>404</strong>
      <div>cannot find page </div>
      <div
        style={{ cursor: "pointer" }}
        onClick={() => {
          navigate("/", { replace: true });
        }}
      >
        return to
        <strong> home page</strong>
      </div>
    </div>
  );
};

export default Http404;
