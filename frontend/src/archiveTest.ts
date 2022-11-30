export const archiveTestData:any[] = [
  {
    label: "인적 사항",
    cycle: "unset",
    auth: "teacher / student / teacherID / admin",
    dataType: "object",
    fields: [
      {
        label: "성명",
        type: "input",
      },
      {
        label: "성별",
        type: "input",
      },
      {
        label: "주민등록번호",
        type: "input",
      },
      {
        label: "주소",
        type: "input",
      },
      {
        label: "성명(부)",
        type: "input",
      },
      {
        label: "성명(모)",
        type: "input",
      },
      {
        label: "생년월일(부)",
        type: "input-date",
      },
      {
        label: "생년월일(모)",
        type: "input-date",
      },
      {
        label: "특기사항",
        type: "input",
      },
    ],
  },
  {
    label: "학적사항",
    cycle: "unset",
    dataType: "array",
  },
  {
    label: "수상경력",
    cycle: "unset",
    dataType: "array",
  },
  {
    label: "자격증 및 취득사항",
    cycle: "unset",
    dataType: "array",
  },
  {
    label: "독서 활동",
    cycle: "unset",
    dataType: "array",
  },
  {
    label: "창의적 체험활동 상황",
    cycle: "unset",
    dataType: "array",
    fields: [
      {
        label: "학년",
        type: "select",
        options: ["11학년", "12학년", "10학년"],
      },
      {
        label: "영역",
        type: "select",
        options: ["자율활동", "진로활동", "동아리활동", "봉사활동"],
      },
      {
        label: "시간",
        type: "input-number",
      },
      {
        label: "특기사항",
        type: "input",
      },
    ],
  },
  {
    label: "봉사활동실적",
    cycle: "unset",
    dataType: "array",
    fields: [
      {
        label: "학년",
        type: "select",
        options: ["11학년", "12학년", "10학년"],
      },
      {
        label: "일자 또는 기간",
        type: "input",
      },
      {
        label: "장소 또는 주관기관명",
        type: "input",
      },
      {
        label: "활동내용",
        type: "input",
      },
      {
        label: "시간",
        type: "input-number",
      },
    ],
  },
];
