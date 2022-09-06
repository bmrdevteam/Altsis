/**
 * @file FIleUploader component
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
 * - FIleUploader component
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 * - change popups with popup component 
 * - create scss file
 *
 */

import React, { useState } from "react";

type Props = {};

function FIleUploader({}: Props) {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "fixed",
        top: "0",
        left: 0,
        zIndex: 3000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity: 0.4,
          height: "100%",
          width: "100%",
          backgroundColor: "#8c8c8c",
          position: "absolute",
          zIndex: 3001,
        }}
      ></div>
      <div
        style={{
          backgroundColor: "#fff",
          width: "800px",
          zIndex: 3002,
          height: "500px",
          opacity: 1,
        }}
      >
        <div style={{ display: "flex" }}>
          <div style={{ flex: "1 1 0" }}>
            <div className="title">
              <h1>File Upload</h1>
            </div>
          </div>
          <div style={{ flex: "1 1 0" }}></div>
        </div>
      </div>
    </div>
  );
}

export default FIleUploader;
