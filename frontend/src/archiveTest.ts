export const archiveTestData = [
  {
    label: "인적사항",
    cycle: "unset",
    auth: "teacher / student / teacherID / admin",
    dataType: "single..?단일 데이터",
    fields: [
      {
        label: "성명",
        type: "string",
      },
      {
        label: "성별",
        type: "string",
      },
      {
        label: "주민등록번호",
        type: "string",
      },
      {
        label: "주소",
        type: "string",
      },
      {
        label: "성명(부)",
        type: "string",
      },
      {
        label: "성명(모)",
        type: "string",
      },
      {
        label: "생년월일(부)",
        type: "date",
      },
      {
        label: "생년월일(모)",
        type: "date",
      },
      {
        label: "특기사항",
        type: "string",
      },
    ],
  },
  {
    label: "학적사항",
    cycle: "unset",
    dataType: "multiple",
  },
  {
    label: "수상경력",
    cycle: "unset",
    dataType: "multiple",
  },
  {
    label: "자격증 및 취득사항",
    cycle: "unset",
    dataType: "multiple",
  },
  {
    label: "독서 활동",
    cycle: "year",
    dataType: "multiple",
  },
  {
    label: "봉사 활동",
    cycle: "unset",
    dataType: "multiple",
    fields: [
      {
        label: "학년",
        type: "select",
        options: ["11학년", "12학년", "10학년"],
      },
      {
        label: "일자 또는 기간",
        type: "dateDuration",
      },
      {
        label: "장소 또는 주관기관명",
        type: "string",
      },
      {
        label: "활동내용",
        type: "string",
      },
      {
        label: "시간",
        type: "time",
      },
    ],
  },
];
