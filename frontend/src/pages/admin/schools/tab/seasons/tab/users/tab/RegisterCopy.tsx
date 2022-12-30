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

import { useState, useRef, useEffect } from "react";
import useDatabase from "hooks/useDatabase";
import _ from "lodash";

// components
import Table from "components/tableV2/Table";
import Popup from "components/popup/Popup";

type Props = {
  setPopupActive: any;
  seasonData: any;
  setIsLoading: any;
};

function Basic(props: Props) {
  const database = useDatabase();

  const [seasonList, setSeasonList] = useState<any[]>();

  async function getSeasonList() {
    const { seasons: result } = await database.R({
      location: `seasons?schoolId=${props.seasonData.schoolId}`,
    });
    return result;
  }

  async function registerCopyFromSeason(_id: string) {
    const result = await database.C({
      location: `registrations/copy`,
      data: {
        fromSeason: _id,
        toSeason: props.seasonData._id,
      },
    });
    return result;
  }

  useEffect(() => {
    getSeasonList().then((res) => {
      setSeasonList(res);
    });
  }, []);

  return (
    <Popup
      title="사용자 등록"
      setState={props.setPopupActive}
      style={{ borderRadius: "4px", maxWidth: "800px", width: "100%" }}
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
                registerCopyFromSeason(e._id).then(() => {
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
