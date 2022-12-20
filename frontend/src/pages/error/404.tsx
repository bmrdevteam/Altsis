/**
 * @file 404 Page
 * 
 * when the page is not avaible
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
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
        position: "fixed",
        width: "100vw",
        left: 0,
        background: "var(--background-color)",
        fontSize: "16px",
      }}
    >
      <strong
        style={{ fontSize: "32px", marginBottom: "4px" }}
        onClick={() => {
          console.log("click");
        }}
      >
        404
      </strong>
      {/* <iframe
        src="https://gifer.com/embed/JwN"
        width={480}
        height={269.76}
        frameBorder="0"
        title="catgif"
      ></iframe> */}

      <div>페이지를 찾을수 없음 </div>
      <div
        style={{ cursor: "pointer" }}
        onClick={() => {
          navigate("/", { replace: true });
        }}
      >
        <strong> 홈으로 </strong>
      </div>
    </div>
  );
};

export default Http404;
