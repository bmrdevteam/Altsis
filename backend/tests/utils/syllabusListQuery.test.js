import { buildSyllabusListQuery } from "../../src/utils/syllabusListQuery.js";

describe("buildSyllabusListQuery", () => {
  test("empty query returns empty object", () => {
    expect(buildSyllabusListQuery()).toEqual({});
    expect(buildSyllabusListQuery({})).toEqual({});
  });

  test("maps season, school, user, classroom", () => {
    expect(
      buildSyllabusListQuery({
        season: "s1",
        school: "sch1",
        user: "u1",
        classroom: "101",
      })
    ).toEqual({
      season: "s1",
      school: "sch1",
      user: "u1",
      classroom: "101",
    });
  });

  test("maps teacher to teachers._id", () => {
    expect(buildSyllabusListQuery({ teacher: "t1" })).toEqual({
      "teachers._id": "t1",
    });
  });

  test("maps confirmed to teachers.confirmed $ne false", () => {
    expect(buildSyllabusListQuery({ confirmed: true })).toEqual({
      "teachers.confirmed": { $ne: false },
    });
  });

  test("ignores student; enrollment path is handled in the controller", () => {
    expect(buildSyllabusListQuery({ student: "st1", season: "s1" })).toEqual({
      season: "s1",
    });
  });
});
