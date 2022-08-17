const T = {
  properties: [
    // single use case of a property
    {
      label: "난이도",
      data: ["상", "중상", "중", "중하", "하"],
    },

    {
      label: "학년",
      data: ["10", "11", "12", "전체"],
    },
    //nesting properties
    {
      label: "교과",
      data: [{ label: "과목", data: ["국어", "수학", "영어"] }],
    },
    //if the user needs nesting of multiple properties
    {
      label: "교과 과목",
      data: [
        { label: "국어", data: ["현대시", "화법과 작문", "문법",'수1'] }, // set array
        { label: "수학", data: ["수1", "수2", "미적분"] }, 
        {
          label: "수학",
          data: [{ label: "수1", data: ["수1.2", "수1.3"] }, "수2", "미적분"],// all children must end in the same level
        },
      ],
    },
  ],
};




