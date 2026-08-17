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
import { ReactNode, useState } from "react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAppNavigate } from "hooks/useAppNavigate";
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
  defaultTab?: string;
  badges?: Record<string, number>;
  onTabChange?: (tabKey: string) => void;
  /** 탭 헤더 왼쪽에 붙는 콘텐츠 (예: 프로필) */
  headerStart?: ReactNode;
}) => {
  /**
   * import hooks
   */
  const navigate = useAppNavigate();
  const location = useLocation();

  const [activeKey, setActiveKey] = useState<string | undefined>(
    props.dontUsePaths ? Object.keys(props.items)[0] : undefined
  );

  /**
   * if the location.hash is "" navigate to the first elemnt in the tab
   */
  useEffect(() => {
    if (!props.dontUsePaths) {
      const raw = location.hash.replace(/^#/, "");
      let key = "";
      try {
        key = decodeURIComponent(raw);
      } catch {
        key = decodeURI(raw);
      }
      if (!key) {
        const keys = Object.keys(props.items);
        const hasBoardChatDeepLink = new URLSearchParams(
          location.search
        ).has("boardChatRoom");
        // 보드 채팅 딥링크인데 해시가 비면 기본 탭(계획서/활동)으로 가지 않음
        const defaultKey = hasBoardChatDeepLink
          ? "채팅"
          : props.defaultTab && keys.includes(props.defaultTab)
            ? props.defaultTab
            : keys[0];
        setActiveKey(defaultKey);
        navigate(
          {
            pathname: location.pathname,
            search: location.search,
            hash: defaultKey,
          },
          { replace: true }
        );
      } else {
        setActiveKey(key);
      }
    }
  }, [location.hash, location.pathname, location.search]);

  // 해시 탭이 나중에 items에 생기면(예: 보드 로드 후 채팅) 다시 맞춤
  useEffect(() => {
    if (props.dontUsePaths) return;
    const raw = location.hash.replace(/^#/, "");
    let key = "";
    try {
      key = decodeURIComponent(raw);
    } catch {
      key = decodeURI(raw);
    }
    if (key && Object.keys(props.items).includes(key) && activeKey !== key) {
      setActiveKey(key);
    }
  }, [props.items, location.hash, props.dontUsePaths, activeKey]);

  /**
   * Tab Header
   *
   * @returns Header element for the tab component
   */
  const Header = () => {
    const hasHeaderStart = props.headerStart != null;
    return (
      <div
        className={`${style.tab_menu_container} ${
          hasHeaderStart ? style.tab_menu_container_with_start : ""
        }`}
      >
        {hasHeaderStart && (
          <div className={style.tab_header_start}>{props.headerStart}</div>
        )}
        <div
          className={style.tab_menu}
          style={{
            justifyContent:
              props.align ?? (hasHeaderStart ? "flex-end" : "center"),
          }}
        >
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
                    props.onTabChange?.(value);
                    !props.dontUsePaths &&
                      navigate(
                        {
                          pathname: location.pathname,
                          search: location.search,
                          hash: value,
                        },
                        { replace: true }
                      );
                  }}
                >
                  {value}
                  {props.badges?.[value] != null && props.badges[value] > 0 && (
                    <span className={style.tab_badge}>
                      {props.badges[value] > 99 ? "99+" : props.badges[value]}
                    </span>
                  )}
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
    <div className={style.tab}>
      <Header />
      {props.children}
      <div className={style.tab_body}>
        {
          /**
           * display the corresponding item based on the location.hash
           */
          props.items[activeKey as keyof typeof props.items]
        }
      </div>
    </div>
  );
};

export default Tab;
