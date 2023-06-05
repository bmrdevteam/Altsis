import Table from "components/tableV2/Table";
import { unflattenObject } from "functions/functions";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useRef } from "react";
import style from "style/pages/archive.module.scss";

type Props = {
  schoolData: any;
  setSchoolData: any;
};

function Links(props: Props) {
  const { SchoolAPI } = useAPIv2();
  const links = useRef<any>(props.schoolData.links || []);

  return (
    <div className={style.section} style={{ marginTop: "24px" }}>
      <div className={style.description} style={{ marginBottom: "24px" }}>
        주소 예시: https://www.naver.com
      </div>
      <Table
        type="object-array"
        data={links.current ?? []}
        onChange={(e) => {
          links.current = e.map((v) => {
            return unflattenObject(v);
          });
          SchoolAPI.USchoolLinks({
            params: { _id: props.schoolData._id },
            data: { links: links.current },
          })
            .then(({ links }) => {
              alert(SUCCESS_MESSAGE);
              props.setSchoolData({ ...props.schoolData, links });
            })
            .catch((err) => {
              ALERT_ERROR(err);
            });
        }}
        header={[
          {
            text: "제목",
            key: "title",
            type: "text",
            textAlign: "center",
          },
          {
            text: "주소",
            key: "url",
            type: "text",
            textAlign: "center",
          },
          {
            text: "수정",
            type: "rowEdit",
            fontSize: "12px",
            fontWeight: "600",
            textAlign: "center",
            width: "80px",
          },
        ]}
      />
    </div>
  );
}

export default Links;
