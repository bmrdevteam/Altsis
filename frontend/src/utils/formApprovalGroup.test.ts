import {
  applyApprovalGroup,
  applyCirculationGroup,
  groupsForFieldKind,
  sanitizeApprovalGroups,
} from "./formApprovalGroup";

const jo = { user: "u1", userId: "jo", userName: "조은길" };
const kim = { user: "u2", userId: "kim", userName: "김민수" };
const lee = { user: "u3", userId: "lee", userName: "이선생" };

const group = {
  id: "g1",
  title: "기본 결재",
  kind: "both" as const,
  members: [
    { label: "부장", user: jo },
    { label: "교장", user: kim },
  ],
};

describe("sanitizeApprovalGroups", () => {
  test("keeps label and user, drops members without userId", () => {
    expect(
      sanitizeApprovalGroups([
        {
          id: "g1",
          title: "  교감·교장  ",
          kind: "approver",
          members: [
            { label: " 부장 ", user: jo },
            { label: "없음", user: { user: "", userId: "", userName: "" } },
            { label: "교장", user: kim },
          ],
        },
      ])
    ).toEqual([
      {
        id: "g1",
        title: "교감·교장",
        kind: "approver",
        members: [
          { label: "부장", user: jo },
          { label: "교장", user: kim },
        ],
      },
    ]);
  });

  test("defaults kind and title, dedupes userId", () => {
    const out = sanitizeApprovalGroups([
      {
        members: [
          { label: "1", user: jo },
          { label: "2", user: { ...jo, userName: "다른표기" } },
        ],
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("both");
    expect(out[0].title).toBe("그룹");
    expect(out[0].members).toHaveLength(1);
    expect(out[0].members[0].user.userId).toBe("jo");
  });
});

describe("groupsForFieldKind", () => {
  test("approver sees approver and both", () => {
    const groups = sanitizeApprovalGroups([
      { id: "a", title: "A", kind: "approver", members: [{ user: jo }] },
      { id: "c", title: "C", kind: "circulation", members: [{ user: jo }] },
      { id: "b", title: "B", kind: "both", members: [{ user: jo }] },
    ]);
    expect(groupsForFieldKind(groups, "approver").map((g) => g.id)).toEqual([
      "a",
      "b",
    ]);
    expect(groupsForFieldKind(groups, "circulation").map((g) => g.id)).toEqual([
      "c",
      "b",
    ]);
  });
});

describe("applyApprovalGroup", () => {
  test("replaces the line with labeled pick steps", () => {
    const { applied, steps, dropped } = applyApprovalGroup(group, [
      "jo",
      "kim",
    ]);
    expect(applied).toBe(true);
    expect(dropped).toEqual([]);
    expect(steps).toEqual([
      { order: 0, label: "부장", mode: "pick", approver: jo },
      { order: 1, label: "교장", mode: "pick", approver: kim },
    ]);
  });

  test("drops non-candidates and uses default labels when empty", () => {
    const { applied, steps, dropped } = applyApprovalGroup(
      {
        ...group,
        members: [
          { label: "부장", user: lee },
          { label: "", user: jo },
          { label: "교장", user: kim },
        ],
      },
      ["jo", "kim"]
    );
    expect(applied).toBe(true);
    expect(dropped).toEqual([{ userId: "lee", userName: "이선생" }]);
    expect(steps.map((s) => s.label)).toEqual(["1차 승인", "교장"]);
    expect(steps[0].approver).toEqual(jo);
  });

  test("does not apply when nobody remains", () => {
    const { applied, steps, dropped } = applyApprovalGroup(group, ["other"]);
    expect(applied).toBe(false);
    expect(steps).toEqual([]);
    expect(dropped).toHaveLength(2);
  });
});

describe("applyCirculationGroup", () => {
  test("replaces with unique candidate users and ignores labels", () => {
    const { applied, users, dropped } = applyCirculationGroup(
      {
        ...group,
        members: [
          { label: "부장", user: jo },
          { label: "중복", user: jo },
          { label: "교장", user: kim },
        ],
      },
      ["jo", "kim"]
    );
    expect(applied).toBe(true);
    expect(dropped).toEqual([]);
    expect(users).toEqual([jo, kim]);
  });

  test("does not apply when all members are dropped", () => {
    const { applied, users, dropped } = applyCirculationGroup(group, []);
    expect(applied).toBe(false);
    expect(users).toEqual([]);
    expect(dropped).toHaveLength(2);
  });
});
