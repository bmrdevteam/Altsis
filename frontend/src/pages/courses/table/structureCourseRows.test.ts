import { structureCourseRows } from "./structureCourseRows";

describe("structureCourseRows", () => {
  test("keeps _id with classTitle and does not mutate the source", () => {
    const source = {
      _id: "syllabus-a",
      classTitle: "도예",
      subject: ["예술", "1"],
      time: [{ label: "월1" }],
      teachers: [{ userName: "김", confirmed: true }],
      count: 1,
      limit: 10,
    };

    const rows = structureCourseRows([source], ["교과", "학년"]);

    expect(rows).toHaveLength(1);
    expect(rows[0]._id).toBe("syllabus-a");
    expect(rows[0].classTitle).toBe("도예");
    expect(rows[0]["교과"]).toBe("예술");
    expect(rows[0]["학년"]).toBe("1");
    expect(rows[0].timeText).toBe("월1");
    expect(rows[0].mentorText).toBe("김");
    expect(source).not.toHaveProperty("timeText");
    expect(source).not.toHaveProperty("교과");
  });

  test("missing time and teachers still returns that course", () => {
    const rows = structureCourseRows(
      [{ _id: "syllabus-b", classTitle: "수학", subject: [] }],
      ["교과"]
    );

    expect(rows[0]._id).toBe("syllabus-b");
    expect(rows[0].classTitle).toBe("수학");
    expect(rows[0].timeText).toBe("");
    expect(rows[0].mentorText).toBe("");
    expect(rows[0].confirmedStatus).toBe("notConfirmed");
  });

  test("subject labels do not replace _id or classTitle", () => {
    const rows = structureCourseRows(
      [
        {
          _id: "syllabus-a",
          classTitle: "도예",
          subject: ["다른id", "다른제목"],
        },
      ],
      ["_id", "classTitle"]
    );

    expect(rows[0]._id).toBe("syllabus-a");
    expect(rows[0].classTitle).toBe("도예");
  });
});
