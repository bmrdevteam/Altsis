import { formDraftSendBlock } from "./formDraftSend";

describe("form draft send", () => {
  test("a calendar message is sent instead of blocked on the client", () => {
    expect(
      formDraftSendBlock({
        pageType: "calendar",
        hasText: true,
      })
    ).toBeNull();
  });

  test("the form editor still requires an open document", () => {
    expect(
      formDraftSendBlock({
        pageType: "form-editor",
        hasEditorApply: false,
        hasText: true,
      })
    ).toBe("양식 문서를 연 뒤 초안을 작성할 수 있습니다.");
  });
});