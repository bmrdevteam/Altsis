import { useLocation, useNavigate } from "react-router-dom";
import style from "./tab.module.scss";

const Tab = (props: { items: object }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <div className={style.tab_menu_container}>
        <div className={style.tab_menu}>
          {Object.keys(props.items).map((value, index) => {
            return (
              <div
                key={index}
                className={`${style.tab_menu_item} ${
                  decodeURI(location.hash).replace("#", "") === value &&
                  style.active
                }`}
                onClick={() => {
                  navigate(`#${value}`, { replace: true });
                }}
              >
                {value}
              </div>
            );
          })}
        </div>
      </div>
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
