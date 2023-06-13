/**
 * @file Seasons Page Tab Item - Form - EditTimetablePopup
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

// components
import Callout from "components/callout/Callout";
import Popup from "components/popup/Popup";
import Table from "components/tableV2/Table";

import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useEffect, useState } from "react";
import { TSeason } from "types/seasons";

type Props = {
  _id: string;
  setPopupActive: React.Dispatch<React.SetStateAction<boolean>>;
  updateFormData: (seasonData: TSeason) => void;
};

const Index = (props: Props) => {
  const { FormAPI, SeasonAPI } = useAPIv2();

  const [forms, setForms] = useState<{ _id: string; title: string }[]>([]);

  useEffect(() => {
    FormAPI.RForms({ query: { type: "timetable", archived: false } })
      .then(({ forms }) => {
        setForms(forms);
      })
      .catch((err) => {
        ALERT_ERROR(err);
      });

    return () => {};
  }, []);

  return (
    <Popup
      style={{ maxWidth: "600px", width: "100%" }}
      title={`시간표 양식 선택`}
      setState={props.setPopupActive}
      closeBtn
      contentScroll
    >
      <div style={{ marginBottom: "24px" }}>
        <Callout
          type="warning"
          title="주의사항"
          showIcon
          description="학기에 양식을 등록한 후 원본 양식이 수정되는 경우 학기 양식에는 반영되지 않습니다. 학기 최초 활성화 이전에는 양식을 다시 선택할 수 있습니다."
        />
      </div>

      <Table
        type="object-array"
        data={forms}
        header={[
          {
            text: "선택",
            key: "select",
            type: "button",
            onClick: (e: any) => {
              SeasonAPI.USeasonFormTimetable({
                params: { _id: props._id },
                data: { form: e._id },
              })
                .then(({ season }) => {
                  alert(SUCCESS_MESSAGE);
                  props.updateFormData(season);
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
              color: "blue",
              padding: "4px",
              round: true,
            },
          },
          { text: "제목", key: "title", type: "text" },

          {
            text: "자세히",
            key: "select",
            type: "button",
            onClick: (e: any) => {
              window.open(
                "/admin/forms/" + e._id,
                "_blank",
                "noopener, noreferrer"
              );
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
    </Popup>
  );
};

export default Index;
