/**
 * @file Seasons Page Tab Item - Registration - RegisterCopy
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
import _ from "lodash";

// components
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { TSeasonWithRegistrations } from "types/seasons";

type Props = {
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  seasonData: TSeasonWithRegistrations;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

function Basic(props: Props) {
  const { SeasonAPI, RegistrationAPI } = useAPIv2();
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
      title="이전 학기 등록 정보 불러오기"
      setState={props.setPopupActive}
      style={{ maxWidth: "640px", width: "100%" }}
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
                RegistrationAPI.CCopyRegistrations({
                  data: {
                    fromSeason: e._id,
                    toSeason: props.seasonData._id,
                  },
                })
                  .then(() => {
                    alert(SUCCESS_MESSAGE);
                    props.setIsLoading(true);
                    props.setPopupActive(false);
                  })
                  .catch((err) => {
                    ALERT_ERROR(err);
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
