/**
 * @file User Page Tab Item - Basic
 *
 * @author jessie129j <jessie129j@gmail.com>
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

import { useState, useEffect } from "react";
import useApi from "hooks/useApi";
import _ from "lodash";

// components
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import useAPIv2 from "hooks/useAPIv2";

type Props = {
  setPopupActive: any;
  seasonData: any;
  setIsLoading: any;
};

function Basic(props: Props) {
  const { RegistrationApi } = useApi();
  const { SeasonAPI } = useAPIv2();
  const [seasonList, setSeasonList] = useState<any[]>();

  useEffect(() => {
    SeasonAPI.RSeasons({ query: { school: props.seasonData.school } }).then(
      ({ seasons }) => {
        setSeasonList(seasons);
      }
    );
  }, []);

  return (
    <Popup
      title="사용자 등록"
      setState={props.setPopupActive}
      style={{ maxWidth: "800px", width: "100%" }}
      closeBtn
      contentScroll
    >
      <div style={{ height: "calc(100vh - 300px)" }}>
        <Table
          type="object-array"
          control
          data={_.differenceBy(seasonList, [props.seasonData], "_id")}
          header={[
            {
              text: "No",
              type: "text",
              key: "tableRowIndex",
              width: "48px",
              textAlign: "center",
            },
            {
              text: "학년도",
              key: "year",
              type: "text",
            },
            {
              text: "학기",
              key: "term",
              type: "text",
            },
            {
              text: "선택",
              key: "select",
              type: "button",
              onClick: (e: any) => {
                RegistrationApi.CRegistrationsCopy({
                  data: {
                    fromSeason: e._id,
                    toSeason: props.seasonData._id,
                  },
                }).then(() => {
                  props.setIsLoading(true);
                  props.setPopupActive(false);
                });
              },
              width: "80px",
              textAlign: "center",
              btnStyle: {
                border: true,
                color: "black",
                padding: "4px",
                round: true,
              },
            },
          ]}
        />
      </div>
    </Popup>
  );
}

export default Basic;
