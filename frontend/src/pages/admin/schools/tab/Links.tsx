import Table from "components/tableV2/Table";
import { unflattenObject } from "functions/functions";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useEffect, useRef, useState } from "react";
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
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      setLinks(props.schoolData.links);
      setIsLoading(false);
    }
    return () => {};
  }, [isLoading]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const saveLinks = (linksToSave: TLink[]) => {
    const isValid = linksToSave.every(
      (link) => link.title !== "" && link.url !== ""
    );
    if (!isValid) return;

    SchoolAPI.USchoolLinks({
      params: { _id: props.schoolData._id },
      data: { links: linksToSave },
    })
      .then(({ links }) => {
        props.setSchoolData({ ...props.schoolData, links });
      })
      .catch((err) => {
        ALERT_ERROR(err);
        setIsLoading(true);
      });
  };

  return (
    <div className={style.section} style={{ marginTop: "24px" }}>
      <div className={style.description} style={{ marginBottom: "24px" }}>
        주소 예시: https://www.naver.com
      </div>
      <Table
        type="object-array"
        data={!isLoading ? links : []}
        onChange={(e) => {
          const newLinks = e.map((v) => unflattenObject(v) as TLink);
          setLinks(newLinks);

          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(() => {
            saveLinks(newLinks);
          }, 500);
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
            type: "input",
            textAlign: "center",
          },
          {
            text: "주소",
            key: "url",
            type: "input",
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
