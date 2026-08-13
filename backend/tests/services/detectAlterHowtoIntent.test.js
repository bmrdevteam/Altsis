import {
  detectAlterHowtoIntent,
  hasAlterConsultIntent,
  hasAlterWorkIntent,
} from "../../src/services/alterCorePrompt.js";

describe("hasAlterWorkIntent", () => {
  test("실행 동사·초안 작성이면 true", () => {
    expect(hasAlterWorkIntent("평가 초안 작성해 줘")).toBe(true);
    expect(hasAlterWorkIntent("문서 다듬어줘")).toBe(true);
    expect(hasAlterWorkIntent("빈 칸을 채워 주세요")).toBe(true);
    expect(hasAlterWorkIntent("점검해 줘")).toBe(true);
    expect(hasAlterWorkIntent("채점해줘")).toBe(true);
    expect(hasAlterWorkIntent("초안을 써 줘")).toBe(true);
    expect(hasAlterWorkIntent("반영해 주세요")).toBe(true);
  });

  test("안내만 물으면 false", () => {
    expect(hasAlterWorkIntent("Alter 사용법")).toBe(false);
    expect(hasAlterWorkIntent("이 화면에서 뭐 할 수 있어?")).toBe(false);
  });
});

describe("hasAlterConsultIntent", () => {
  test("업무 해결·방법 상담이면 true", () => {
    expect(
      hasAlterConsultIntent("30명 멘토평가를 AI로 어떻게 하면 효율적일까?")
    ).toBe(true);
    expect(
      hasAlterConsultIntent("평가 문장은 어떻게 작성하면 좋을까")
    ).toBe(true);
    expect(hasAlterConsultIntent("어떻게 쓰면 좋은 평가 문장일까")).toBe(
      true
    );
    expect(hasAlterConsultIntent("일괄로 쓰려면 뭘 쓰면 돼?")).toBe(true);
  });

  test("구어체 어떻게 하지/해요·하고 싶은데도 true", () => {
    expect(
      hasAlterConsultIntent("나 수업 개설을 하고 싶은데 어떻게 하지?")
    ).toBe(true);
    expect(hasAlterConsultIntent("이거 어떻게 해요?")).toBe(true);
    expect(hasAlterConsultIntent("강의계획서는 어떻게 해야 해?")).toBe(true);
  });

  test("순수 실행 요청이면 false", () => {
    expect(hasAlterConsultIntent("평가 초안 작성해 줘")).toBe(false);
    expect(hasAlterConsultIntent("문서 다듬어줘")).toBe(false);
  });
});

describe("detectAlterHowtoIntent", () => {
  test("강한 사용법 신호면 true", () => {
    expect(detectAlterHowtoIntent("Alter 사용법")).toBe(true);
    expect(detectAlterHowtoIntent("알터 도움말")).toBe(true);
    expect(detectAlterHowtoIntent("이 화면에서 뭐 할 수 있어?")).toBe(true);
    expect(detectAlterHowtoIntent("스킬이 뭐가 있어요?")).toBe(true);
    expect(detectAlterHowtoIntent("/도움말")).toBe(true);
    expect(detectAlterHowtoIntent("/사용법")).toBe(true);
    expect(detectAlterHowtoIntent("Alter가 뭐야")).toBe(true);
  });

  test("업무 해결 상담이면 true", () => {
    expect(
      detectAlterHowtoIntent("30명 멘토평가를 AI로 어떻게 하면 효율적일까?")
    ).toBe(true);
    expect(
      detectAlterHowtoIntent("평가 문장은 어떻게 작성하면 좋을까")
    ).toBe(true);
    expect(
      detectAlterHowtoIntent("나 수업 개설을 하고 싶은데 어떻게 하지?")
    ).toBe(true);
    expect(detectAlterHowtoIntent("이거 어떻게 해요?")).toBe(true);
  });

  test("순수 실행 요청이면 false", () => {
    expect(detectAlterHowtoIntent("평가 초안 작성해 줘")).toBe(false);
    expect(detectAlterHowtoIntent("문서 다듬어줘")).toBe(false);
    expect(detectAlterHowtoIntent("학생 기록 일괄로 작성해줘")).toBe(false);
  });

  test("상담 우선: 사용법+업무 혼합이면 true", () => {
    expect(
      detectAlterHowtoIntent("사용법 알려주고 평가 초안도 작성해줘")
    ).toBe(true);
  });

  test("빈 문자열은 false", () => {
    expect(detectAlterHowtoIntent("")).toBe(false);
  });
});
