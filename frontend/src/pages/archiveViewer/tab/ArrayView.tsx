import Table from "components/tableV2/Table";
import { useAuth } from "contexts/authContext";
import _ from "lodash";
import { useEffect, useState } from "react";
import useApi from "hooks/useApi";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "components/loading/Loading";

type Props = {};

const One = (props: Props) => {
  const { ArchiveApi } = useApi();
  const { pid } = useParams(); // archive label ex) 인적 사항
  const navigate = useNavigate();

  const { currentSchool, currentRegistration } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [archiveData, setArchiveData] = useState<any[]>([]);

  useEffect(() => {
    if (currentRegistration && pid) {
      setIsLoading(true);
    }
  }, [currentRegistration, pid]);

  useEffect(() => {
    if (isLoading && currentSchool?.formArchive && currentRegistration && pid) {
      const myFormArchive = _.find(currentSchool?.formArchive, {
        label: pid,
        authOptionStudentView: true,
      });
      if (!myFormArchive) {
        alert("조회 가능한 정보가 없습니다.");
        navigate("/myArchive");
      } else {
        ArchiveApi.RArchiveByRegistration({
          registrationId: currentRegistration?._id,
          label: pid,
        })
          .then((res) => {
            setArchiveData(res.data[pid]);
          })
          .then(() => {
            setIsLoading(false);
          });
      }
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
          defaultPageBy={10}
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
