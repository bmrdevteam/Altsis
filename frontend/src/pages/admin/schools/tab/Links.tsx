import Table from "components/tableV2/Table";
import { unflattenObject } from "functions/functions";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useEffect, useState } from "react";
import style from "style/pages/archive.module.scss";

type Props = {
  schoolData: any;
  setSchoolData: any;
};

type TLink = {
  title: string;
  url: string;
};
function Links(props: Props) {
  const { SchoolAPI } = useAPIv2();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [links, setLinks] = useState<TLink[]>([]);

  useEffect(() => {
    if (isLoading) {
      setLinks(props.schoolData.links);
      setIsLoading(false);
    }
    return () => {};
  }, [isLoading]);

  return (
    <div className={style.section} style={{ marginTop: "24px" }}>
      <div className={style.description} style={{ marginBottom: "24px" }}>
        주소 예시: https://www.naver.com
      </div>
      <Table
        type="object-array"
        data={!isLoading ? links : []}
        onChange={(e) => {
          const links = e.map((v) => {
            return unflattenObject(v) as TLink;
          });
          for (let link of links) {
            if (link.title === "") {
              setIsLoading(true);
              return alert("제목을 입력해주세요");
            }
            if (link.url === "") {
              setIsLoading(true);
              return alert("주소를 입력해주세요");
            }
          }
          SchoolAPI.USchoolLinks({
            params: { _id: props.schoolData._id },
            data: { links },
          })
            .then(({ links }) => {
              alert(SUCCESS_MESSAGE);
              props.setSchoolData({ ...props.schoolData, links });
              setLinks(links);
            })
            .catch((err) => {
              ALERT_ERROR(err);
              setIsLoading(true);
            });
        }}
        header={[
          {
            text: "순서",
            fontSize: "12px",
            fontWeight: "600",
            type: "rowOrder",
            width: "80px",
            textAlign: "center",
          },
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
