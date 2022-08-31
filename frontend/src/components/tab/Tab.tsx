import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import style from "./tab.module.scss";

const Tab = (props: {
  children?: JSX.Element[] | JSX.Element;
  items: object;
  align?: "flex-start" | "center" | "flex-end";
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.hash === "") {
      navigate(`#${Object.keys(props.items)[0]}`);
    }

    return () => {};
  }, [location.hash]);
  const Header = () => {
    return (
      <div className={style.tab_menu_container}>
        <div className={style.tab_menu} style={{ justifyContent: props.align }}>
          {Object.keys(props.items).map((value, index) => {
            return (
              <div
                key={index}
                className={`${style.tab_menu_item} ${
                  decodeURI(location.hash).replace("#", "") === value &&
                  style.active
                }`}
                
                onClick={(e: any) => {
                  navigate(`#${value}`, { replace: true });
                }}
              >
                {value}
              </div>
            );
          })}
        </div>
        <div className={style.indicator_container}>
          <div
            className={style.indicator}
            id="indicator"
          ></div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Header />
      {props.children}
      <div>
        {
          props.items[
            decodeURI(location.hash).replace(
              "#",
              ""
            ) as keyof typeof props.items
          ]
        }
      </div>
    </>
  );
};

export default Tab;
