export const archiveTestData: any[] = [
  {
    label: "등록",
    dataType: "array",
    fields: [
      {
        label: "학년/구분",
        type: "select",
        options: ["11학년", "12학년", "10학년"],
      },
      {
        label: "학번",
        type: "input",
      },
      {
        label: "담임 성명",
        type: "input",
      },
    ],
  },
  {
    label: "인적 사항",
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
    label: "출결사항",
    dataType: "array",
    fields: [
      {
        label: "학년/구분",
        type: "select",
        options: ["11학년", "12학년", "10학년"],
      },
      {
        label: "수업일수",
        type: "input-number",
      },
      {
        label: "결석일수/질병",
        type: "input-number",
      },
      {
        label: "결석일수/미인정",
        type: "input-number",
      },
      {
        label: "결석일수/기타",
        type: "input-number",
      },
      {
        label: "조퇴/질병",
        type: "input-number",
      },
      {
        label: "조퇴/미인정",
        type: "input-number",
      },
      {
        label: "조퇴/기타",
        type: "input-number",
      },

      {
        label: "결과/질병",
        type: "input-number",
      },
      {
        label: "결과/미인정",
        type: "input-number",
      },
      {
        label: "결과/기타",
        type: "input-number",
      },
      {
        label: "특기사항",
        type: "input",
      },
    ],
  },
  {
    label: "수상경력",
    dataType: "array",
    fields: [
      {
        label: "수상명",
        type: "input",
      },
      {
        label: "등위",
        type: "input",
      },
      {
        label: "수상년원일",
        type: "date",
      },
      {
        label: "수여기관",
        type: "input",
      },
      {
        label: "참가대상",
        type: "input",
      },
    ],
  },
  {
    label: "자격증 및 취득사항",
    dataType: "array",
  },

  {
    label: "창의적 체험활동 상황",
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
  {
    label: "독서활동상황",
    dataType: "array",
    fields: [
      {
        label: "학년",
        type: "select",
        options: ["11학년", "12학년", "10학년"],
      },
      {
        label: "과목 또는 공통",
        type: "input",
      },
      {
        label: "독서활동 상황",
        type: "input",
      },
    ],
  },
  {
    label: "행동특성 및 종합의견",
    dataType: "array",
    fields: [
      {
        label: "학년",
        type: "select",
        options: ["11학년", "12학년", "10학년"],
      },
      {
        label: "담임의견란",
        type: "input",
      },
    ],
  },
  {
    label: "진로희망사항",
    dataType: "array",
    fields: [
      {
        label: "학년",
        type: "select",
        options: ["11학년", "12학년", "10학년"],
      },
      {
        label: "진로희망",
        type: "input",
      },
      {
        label: "희망사유",
        type: "input",
      },
    ],
  },
];
