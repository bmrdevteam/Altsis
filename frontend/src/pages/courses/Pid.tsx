import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Divider from "../../components/divider/Divider";
import NavigationLinks from "../../components/navigationLinks/NavigationLinks";
import Tab from "../../components/tab/Tab";
import style from "../../style/pages/courses/course.module.scss";
type Props = {};

const Course = (props: Props) => {
  const { pid } = useParams<"pid">();
  const navigate = useNavigate();

  const [courseData, setCourseData] = useState({
    _id: 123794078125781,
    timestamps: "2022-06-18 10:00:00",
    classTitle: "웹프로그래밍 기초",
    userId: "mrgoodway",
    userName: "조은길",
    schoolId: "bmrhs",
    schoolName: "별무리고등학교",
    year: "2022학년도",
    term: "1쿼터",
    comfirm: "Y",
    time: [
      {
        label: "화2",
        start: "09:45",
        end: "10:30",
      },
      {
        label: "목2",
        start: "09:45",
        end: "10:30",
      },
    ],
    point: "2",
    classroom: "101호",
    subject: ["정보", "웹프로그래밍1"],
    teachers: [
      {
        userId: "mrgoodway",
        userName: "조은길",
      },
      {
        userId: "asdfqvd",
        userName: "이세찬",
      },
    ],
    description: {
      description: "웹프로그래밍을 배운다.",
      attachments: [
        "https://www.youtube.com/watch?v=pEE_uJ-joUA",
        "https://www.next-t.co.kr/public/uploads/7b7f7e2138e29e598cd0cdf2c85ea08d.jpg",
      ],
    },
  });

  useEffect(() => {
    navigate("#강의 계획");

    return () => {};
  }, []);
  const ClassInfo = () => {
    return (
      <div className={style.class_info}>
        전반적인 수업 설명 등 사진? 영상? 등
        <br />
        <br />
        이상을 청춘의 낙원을 그들은 이것이다. 이상이 눈이 앞이 실로 있으랴? 싹이
        얼마나 바이며, 말이다. 모래뿐일 꾸며 속에서 길을 사막이다. 천지는 사랑의
        이것은 황금시대를 운다. 보이는 싸인 끝에 철환하였는가? 발휘하기 할지니,
        이상은 실로 방지하는 할지라도 용감하고 쓸쓸하랴? 얼음이 소리다.이것은
        황금시대의 것은 듣기만 것이다. 열락의 유소년에게서 대한 구하기 커다란
        능히 생명을 사막이다. 가슴에 기관과 살 그들은 것은 하였으며, 아니한
        가지에 넣는 봄바람이다. 황금시대의 위하여서 별과 때까지 청춘을 품고 대한
      </div>
    );
  };
  const TeacherInfo = () => {
    return (
      <div className={`${style.tab_item} ${style.teachers_container}`}>
        <div className={style.teachers}>
          {courseData.teachers.map((value, index) => {
            return (
              <>
                <div key={index} className={style.teacher}>
                  <span className={style.name}>{value.userName} 선생님</span>
                  <span className={style.subject}>
                    과목: {courseData.subject[0]}
                  </span>
                </div>
              </>
            );
          })}
          {/* 선생님,prev classes, 관련 수업등 */}
        </div>
      </div>
    );
  };
  const SyllabusInfo = () => {
    return (
      <div className={style.tab_item}>
        1.
        <br />
        2.
        <br />
        3.
      </div>
    );
  };
  const ClassMatrialInfo = () => {
    return <div className={style.tab_item}>교제? 준비물등 수업에 필요한것</div>;
  };
  const EvaluationInfo = () => {
    return <div className={style.tab_item}>평가 계획</div>;
  };

  return (
    <div className={style.section}>
      <NavigationLinks />
      <div className={style.title}>{courseData.classTitle}</div>
      <div className={style.categories_container}>
        <div className={style.categories}>
          <div className={style.category}>교과: {courseData.subject[0]}</div>
          <div className={style.category}>과목: {courseData.subject[1]}</div>
          <div className={style.category}>학점: {courseData.point}</div>
          <div className={style.category}>난이도: 상</div>
          <div className={style.category}>학년: 전체</div>
          <div className={style.category}>강의실: {courseData.classroom}</div>
        </div>
      </div>
      <Divider />

      <ClassInfo />
      <div className={style.tab}>
        <Tab
          items={{
            "강의 계획": <SyllabusInfo />,
            선생님: <TeacherInfo />,
            교재: <ClassMatrialInfo />,
            평가: <EvaluationInfo />,
          }}
        />
      </div>
      <Divider />
      <div>비슷한 수업</div>
    </div>
  );
};

export default Course;
