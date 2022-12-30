/**
 * @file Tab component
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * - Tab Component
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
 */
import { useState } from "react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import style from "./tab.module.scss";

/**
 * Tab Component
 *
 *
 * @param children children elements are placed in the middle of the tab header and content
 * @param items items are the tab elements {"tabName(displayed name)": element}
 * @param align alignment of the header - defaults to center
 *
 * @returns Tab Component
 *
 * @example
 * <Tab
 *  items={{
 *    TabName1: <element1 />,
 *    TabName2: <element2 />,
 *    TabName3: <element3 />,
 *    TabName4: <element4 />,
 *   }}
 *  align={"flex-start"}
 * />
 *
 * @example
 *
 * <Tab
 *  items={{
 *    TabName1: <element1 />,
 *    TabName2: <element2 />,
 *    TabName3: <element3 />,
 *    TabName4: <element4 />,
 *   }}
 *  align={"flex-start"}
 * >
 *  <ChildrenElemnet/>
 * </Tab>
 *
 */
const Tab = (props: {
  children?: JSX.Element[] | JSX.Element;
  items: object;
  align?: "flex-start" | "center" | "flex-end";
  dontUsePaths?: boolean;
}) => {
  /**
   * import hooks
   */
  const navigate = useNavigate();
  const location = useLocation();

  const [activeKey, setActiveKey] = useState<string>();

  /**
   * if the location.hash is "" navigate to the first elemnt in the tab
   */
  useEffect(() => {
    if (location.hash === "" && !props.dontUsePaths) {
      navigate(`#${Object.keys(props.items)[0]}`);
    }
    if (props.dontUsePaths) {
      setActiveKey(Object.keys(props.items)[0])
    }
  }, [location.hash, navigate, props.items, props.dontUsePaths]);

  useEffect(() => {
    if(!props.dontUsePaths){

      setActiveKey(decodeURI(location.hash).replace("#", ""));
    }
  }, [location.hash]);

  /**
   * Tab Header
   *
   * @returns Header element for the tab component
   */
  const Header = () => {
    return (
      <div className={style.tab_menu_container}>
        <div className={style.tab_menu} style={{ justifyContent: props.align }}>
          {
            /**
             * run through the keys in the items prop
             */
            Object.keys(props.items).map((value, index) => {
              return (
                <div
                  key={index}
                  className={`${style.tab_menu_item} ${
                    activeKey === value && style.active
                  }`}
                  onClick={() => {

                    
                    setActiveKey(value);
                    !props.dontUsePaths &&
                      navigate(`#${value}`, { replace: true });
                  }}
                >
                  {value}
                </div>
              );
            })
          }
        </div>
        <div className={style.indicator_container}>
          <div className={style.indicator} id="indicator"></div>
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
          /**
           * display the corresponding item based on the location.hash
           */
          props.items[activeKey as keyof typeof props.items]
        }
      </div>
    </>
  );
};

export default Tab;
