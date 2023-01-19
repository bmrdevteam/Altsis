import Svg from "assets/svg/Svg";
import Loading from "components/loading/Loading";
import Select from "components/select/Select";
import { useAuth } from "contexts/authContext";
import EditorParser from "editor/EditorParser";
import useApi from "hooks/useApi";
import useDatabase from "hooks/useDatabase";
import _ from "lodash";
import { useEffect, useState } from "react";
import style from "style/pages/userSearchResult/docsTab.module.scss";
type Props = {
  user: any
};

function Docs(props: Props) {
  const database = useDatabase();
  const { ArchiveApi, FormApi } = useApi();
  const { currentSchool } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [formData, setFormData] = useState<any>();
  const [printForms, setPrintForms] = useState<any>([]);
  const [DBData, setDBData] = useState<any>();

  async function getDBData(userId: any) {
    console.log(userId);

    const archive = await ArchiveApi.RArchives({
      school: currentSchool.school,
      userId: userId,
    });

    let processedEvaluation: any[] = [];
    let processedEvaluationByYear: any = [];
    const { enrollments: evaluations } = await database.R({
      location: `enrollments/evaluations?studentId=${userId}&school=${currentSchool.school}`,
    });

    for (let i = 0; i < evaluations.length; i++) {
      const evaluation = evaluations[i];
      const Id = `${evaluation.season}${evaluation.subject[0]}${evaluation.subject[1]}`;
      const IdByYear = `${evaluation.year}${evaluation.subject[0]}${evaluation.subject[1]}`;

      if (_.findIndex(processedEvaluation, ["id", Id]) === -1) {
        processedEvaluation.push({
          id: Id,
          교과: evaluation?.subject[0],
          과목: evaluation?.subject[1],
          단위수: evaluation?.point,
          "멘토 평가": evaluation.evaluation["멘토평가"],
          "자기 평가": evaluation.evaluation["자기평가"],
          점수: evaluation.evaluation["점수"],
          평가: evaluation.evaluation["평가"],
          년도: evaluation.year,
          학기: evaluation.term,
        });
      } else {
        processedEvaluation[
          _.findIndex(processedEvaluation, ["id", Id])
        ].단위수 += evaluation.point;
      }
      if (_.findIndex(processedEvaluationByYear, ["id", IdByYear]) === -1) {
        processedEvaluationByYear.push({
          id: IdByYear,
          학년: evaluation.studentGrade,
          년도: evaluation.year,
          교과: evaluation?.subject[0],
          과목: evaluation?.subject[1],
          //만약 1년 단위로 합치고있다면-...-
          "세부능력 및 특기사항": evaluation.evaluation["멘토평가"],
          [`${evaluation.term}/단위수`]: evaluation?.point,
          [`${evaluation.term}/멘토 평가`]: evaluation.evaluation["멘토평가"],
          [`${evaluation.term}/점수`]: evaluation.evaluation["점수"],
          [`${evaluation.term}/평가`]: evaluation.evaluation["평가"],
        });
      } else {
        Object.assign(
          processedEvaluationByYear[
            _.findIndex(processedEvaluationByYear, ["id", IdByYear])
          ],
          {
            [`${evaluation.term}/단위수`]:
              evaluation?.point +
              parseInt(
                _.find(processedEvaluationByYear, ["id", IdByYear])[
                  `${evaluation.term}/단위수`
                ] || 0
              ),
            [`${evaluation.term}/멘토 평가`]: evaluation.evaluation["멘토평가"],
            [`${evaluation.term}/점수`]: evaluation.evaluation["점수"],
            [`${evaluation.term}/평가`]: evaluation.evaluation["평가"],
          }
        );
      }
    }
    return {
      [currentSchool.schoolId]: {
        archive: archive.data,
        evaluation: processedEvaluationByYear,
      },
    };
  }

  async function getFormData(id: string) {
    const result = await database.R({
      location: `forms/` + id,
    });
    return result;
  }

  useEffect(() => {
    getDBData(props.user.userId).then((res) => {
      setDBData(res);
      setLoading(false);
    });

    FormApi.RForms({}).then((res) => {
      const r = res.filter((val: any) => val.type === "print");
      setPrintForms(r);
      getFormData(r[0]._id).then((result) => {
        setFormData(result);
        setLoading(false);
      });
    });
  }, []);

  return (
    <>
      <div className={style.section}>
        <div className={style.search}>
          <div className={style.label}>문서 종류 선택</div>
          <Select
            style={{ borderRadius: "4px" }}
            options={[
              ...printForms.map((val: any) => {
                return { text: val.title, value: val._id };
              }),
            ]}
            onChange={(val: string) => {
              FormApi.RForm(val).then((res) => {
                setFormData(res);
              });
            }}
          />
          <div
            className="btn"
            onClick={() => {
              window.print();
            }}
          >
            <Svg type={"print"} />
          </div>
        </div>
        {!loading ? (
          <EditorParser auth="view" data={formData} dbData={DBData} />
        ) : (
          <Loading height={"calc(100vh - 55px)"} />
        )}
      </div>
    </>
  );
}

export default Docs;
