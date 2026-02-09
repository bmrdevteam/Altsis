/**
 * @file NavigationLinks
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * - NavigationLinks component
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
 * - change the navlink name to korean
 *
 */

import { useLocation } from "react-router-dom";
import { useAppNavigate } from "hooks/useAppNavigate";

/**
 * NavigationLinks component
 *
 * @returns NavigationLinks component
 *
 * @example <NavigationLinks/>
 */

const NavigationLinks = () => {
  const navigate = useAppNavigate();
  const location = useLocation();
  const allSegments = location.pathname.split("/").filter((x) => x !== "");
  // Skip first 2 segments (academyId, schoolId)
  const locationArr = allSegments.slice(2);

  return (
    <div
      style={{
        fontSize: "12px",
        fontWeight: 500,
        marginBottom: "18px",
        display: "flex",
        color: "var(--accent-1)",
      }}
    >
      {locationArr.map((value, index) => {
        let to = "";
        for (let i = 0; i < index + 1; i++) {
          to += `/${locationArr[i]}`;
        }

        return (
          <div key={index} style={{ wordBreak: "keep-all" }}>
            <span>&nbsp;/&nbsp;</span>
            <span
              style={{ cursor: "pointer" }}
              onClick={() => {
                navigate(to, { replace: true });
              }}
            >
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default NavigationLinks;
