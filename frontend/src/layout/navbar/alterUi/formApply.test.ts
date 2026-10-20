import { formApplyPlan, formCreateBody } from "./formApply";

const blocks = [{ id: "b1", type: "paragraph" }];

describe("form apply", () => {
  test("a draft without confirmation is not a save body", () => {
    const plan = formApplyPlan(
      { title: "10학년 시간표", formType: "timetable", blocks },
      false
    );
    expect(plan.ok).toBe(false);
    expect(plan).not.toHaveProperty("body");
  });

  test("confirmation plus blocks creates a form, and an open editor does not", () => {
    const draft = {
      confirmationId: "card-1",
      title: "10학년 시간표",
      formType: "timetable",
      blocks,
    };
    const saved = formApplyPlan(draft, false);
    expect(saved).toEqual({
      ok: true,
      target: "create",
      body: formCreateBody(draft),
    });
    expect(saved.ok && saved.body).toEqual({
      type: "timetable",
      title: "10학년 시간표",
      data: blocks,
    });
    expect(formApplyPlan(draft, true)).toEqual({ ok: true, target: "editor" });
  });
});
