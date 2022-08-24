import React, { useEffect } from "react";

type Props = {};

const Home = (props: Props) => {
  useEffect(() => {
    console.log("effect");

    return () => {};
  }, []);

  return (
    <div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 315 415"
        width={"100px"}
        height={"100px"}
      >
        <path
          style={{
            fill: "#fff",
            stroke: "#000",
            strokeMiterlimit: 10,
            strokeWidth: "15px",
          }}
          d="M394.55,450h-300V50h200l100,100Z"
          transform="translate(-89.55 -45)"
        />
      </svg>
    </div>
  );
};

export default Home;
