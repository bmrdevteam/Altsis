import Table from "components/tableV2/Table";
import { useAuth } from "contexts/authContext";
import _ from "lodash";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "components/loading/Loading";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";

type Props = {};

const One = (props: Props) => {
  const { ArchiveAPI } = useAPIv2();
  const { pid } = useParams(); // archive label ex) 인적 사항

  const { currentSchool, currentRegistration } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [archiveData, setArchiveData] = useState<any[]>([]);

  useEffect(() => {
    if (isLoading && currentRegistration && pid) {
      ArchiveAPI.RArchiveByRegistration({
        query: { registration: currentRegistration?._id, label: pid },
      })
        .then(({ archive }) => {
          setArchiveData(archive.data[pid]);
        })
        .then(() => {
          setIsLoading(false);
        })
        .catch((err) => {
          ALERT_ERROR(err);
        });
    }
  }, [isLoading]);

  function formArchive() {
    return (
      currentSchool.formArchive?.filter((val: any) => {
        return val.label === pid;
      })[0] ?? { fields: [] }
    );
  }

  function archiveHeader() {
    let arr: any = [
      {
        text: "No",
        type: "text",
        key: "tableRowIndex",
        width: "48px",
        textAlign: "center",
      },
    ];
    formArchive().fields?.map((val: any) => {
      arr.push({
        text: val.label,
        key: val.label,
      });
    });
    return arr;
  }

  return !isLoading ? (
    <>
      <div style={{ marginTop: "24px" }}>
        <Table
          defaultPageBy={200}
          control
          type="object-array"
          data={archiveData ?? []}
          header={archiveHeader()}
        />
      </div>
    </>
  ) : (
    <Loading height={"calc(100vh - 55px)"} />
  );
};

export default One;
