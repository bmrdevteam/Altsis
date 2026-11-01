import { mentoringSyllabusQuery } from "./mentoringSyllabusQuery";

describe("mentoringSyllabusQuery", () => {
  test("관리자는 학기 전체 수업을 조회한다", () => {
    expect(
      mentoringSyllabusQuery({ auth: "admin", _id: "admin-oid" }, "season-1", "school")
    ).toEqual({ season: "season-1" });
  });

  test("교사는 본인이 담당인 수업만 조회한다", () => {
    expect(
      mentoringSyllabusQuery(
        { auth: "member", _id: "teacher-oid", schools: [] },
        "season-1",
        "school"
      )
    ).toEqual({ season: "season-1", teacher: "teacher-oid" });
  });
});
