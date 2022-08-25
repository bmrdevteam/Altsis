import React, { useEffect } from "react";

type Props = {};

const Home = (props: Props) => {
  useEffect(() => {
    console.log("effect");

    return () => {};
  }, []);

  return <div></div>;
};

export default Home;
