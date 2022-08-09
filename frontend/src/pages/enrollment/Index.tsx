import Divider from "../../components/divider/Divider";
import Input from "../../components/input/Input";
import NavigationLinks from "../../components/navigationLinks/NavigationLinks";
import Select from "../../components/select/Select";
import Table from "../../components/table/Table";
import style from "../../style/pages/enrollment.module.scss";

type Props = {};

const Enrollment = (props: Props) => {
  return (
    <div className={style.section}>
      <NavigationLinks />
      <div className={style.title}>수강신청</div>

      <div className={style.search_container}>
        <Input placeholder={"수업명으로 검색"} />
        <div style={{ height: "8px" }}></div>
        <div style={{ display: "flex" }}>
          <Select
            options={[
              { text: "월", value: "mon" },
              { text: "화", value: "tue" },
              { text: "수", value: "wed" },
              { text: "목", value: "thur" },
              { text: "금", value: "fri" },
              { text: "토", value: "sat" },
              { text: "일", value: "sun" },
            ]}
          />
          <Select
            options={[
              { text: "수학", value: "mon" },
              { text: "영어", value: "tue" },
              { text: "국어", value: "wed" },
              { text: "체육", value: "thur" },
              { text: "미술", value: "fri" },
              { text: "외국어 1", value: "sat" },
              { text: "외국어 2", value: "sun" },
            ]}
          />
          <Select
            options={[
              { text: "1 학점", value: "mon" },
              { text: "2 학점", value: "tue" },
              { text: "3 학점", value: "wed" },
              { text: "4 학점", value: "thur" },
              { text: "5 학점", value: "fri" },
              { text: "6 학점", value: "sat" },
            ]}
          />
        </div>
      </div>
      <Divider />
      <Table
        data={[
          {
            _id: 123794078125781,
            timestamps: "2022-06-18 10:00:00",
            classTitle: "14학년 국어",
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
                userId: "mrgoodway",
                userName: "조은길",
              },
            ],
            description: {
              description: "웹프로그래밍을 배운다.",
              attachments: [
                "https://www.youtube.com/watch?v=pEE_uJ-joUA",
                "https://www.next-t.co.kr/public/uploads/7b7f7e2138e29e598cd0cdf2c85ea08d.jpg",
              ],
            },
          },
          {
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
            classroom: "세미나1",
            subject: ["국어", "현대 국어"],
            teachers: [
              {
                userId: "mrgoodway",
                userName: "조은길",
              },
              {
                userId: "mrgoodway",
                userName: "조은길",
              },
            ],
            description: {
              description: "웹프로그래밍을 배운다.",
              attachments: [
                "https://www.youtube.com/watch?v=pEE_uJ-joUA",
                "https://www.next-t.co.kr/public/uploads/7b7f7e2138e29e598cd0cdf2c85ea08d.jpg",
              ],
            },
          },
        ]}
        header={[
          {
            text: "수업 명",
            key: "classTitle",
            type: "string",
          },
          {
            text: "과목",
            key: "subject",
            type: "string",
            width: "240px",
          },
          {
            text: "강의실",
            key: "classroom",
            type: "string",
            width: "120px",
          },
          {
            text: "자세히",
            key: "_id",
            type: "link",
            link: "/classes",
            width: "80px",
            align: "center",
          },
        ]}
        style={{ backgroundColor: "#fff", border: "none", rowHeight: "60px" }}
      />
    </div>
  );
};

export default Enrollment;
