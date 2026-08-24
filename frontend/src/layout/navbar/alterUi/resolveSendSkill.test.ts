import { resolveSendSkill } from "./resolveSendSkill";

describe("resolveSendSkill", () => {
  test("chat on docs page never upgrades to document-review", () => {
    const phrases = [
      "문서를 지침에 맞게 점검해 주세요",
      "문서 점검이 아니라 챗봇으로서 평가해 주세요",
      "생활기록부 검토",
    ];
    for (const text of phrases) {
      expect(
        resolveSendSkill({
          selectedSkill: "chat",
          pageType: "docs",
          text,
        })
      ).toBe("chat");
    }
  });

  test("document-review chip on docs still runs document-review", () => {
    expect(
      resolveSendSkill({
        selectedSkill: "document-review",
        pageType: "docs",
        text: "문서를 지침에 맞게 점검해 주세요",
      })
    ).toBe("document-review");
    expect(
      resolveSendSkill({
        selectedSkill: "document-review",
        pageType: "docs",
        text: "생활기록부 검토",
      })
    ).toBe("document-review");
  });

  test("chat still upgrades other explicit draft intents", () => {
    expect(
      resolveSendSkill({
        selectedSkill: "chat",
        pageType: "evaluation",
        text: "평가 초안 작성",
      })
    ).toBe("evaluation-draft");
  });
});
