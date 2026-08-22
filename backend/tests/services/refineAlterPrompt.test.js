import { FEATURE_PROFILES, PROMPT_LIMITS } from "../../src/services/aiPromptPolicy.js";
import { ALTER_HOWTO_EXAMPLE_PROMPTS } from "../../src/services/alterCorePrompt.js";
import {
  REFINE_ALTER_PROMPT_RULES,
  buildRefineAlterPromptMessages,
  sanitizeRefinedPrompt,
} from "../../src/services/refineAlterPrompt.js";

describe("promptRefine profile", () => {
  test("짧은 생성 한도를 쓴다", () => {
    expect(FEATURE_PROFILES.promptRefine.feature).toBe("prompt_refine");
    expect(FEATURE_PROFILES.promptRefine.maxTokens).toBe(400);
    expect(PROMPT_LIMITS.REFINE_PROMPT_CHARS).toBe(800);
    expect(PROMPT_LIMITS.REFINE_PROMPT_EXCERPT_CHARS).toBe(2500);
  });
});

describe("REFINE_ALTER_PROMPT_RULES", () => {
  test("본문 초안·설명 머리말을 금지한다", () => {
    expect(REFINE_ALTER_PROMPT_RULES).toMatch(/본문이나 초안 자체는 작성하지/);
    expect(REFINE_ALTER_PROMPT_RULES).toMatch(/요청문 한 덩어리/);
    expect(REFINE_ALTER_PROMPT_RULES).toMatch(/머리말은 넣지/);
    expect(REFINE_ALTER_PROMPT_RULES).toMatch(/민감정보/);
    expect(REFINE_ALTER_PROMPT_RULES).toMatch(/현재 내용 발췌/);
    expect(REFINE_ALTER_PROMPT_RULES).toMatch(/본문을 다시 쓰지/);
  });
});

describe("sanitizeRefinedPrompt", () => {
  test("따옴표와 머리말을 벗긴다", () => {
    expect(sanitizeRefinedPrompt('"멘토 의견은 2문장"')).toBe(
      "멘토 의견은 2문장"
    );
    expect(sanitizeRefinedPrompt("요청문: 성장 중심으로")).toBe(
      "성장 중심으로"
    );
  });

  test("빈 문자열은 빈 값", () => {
    expect(sanitizeRefinedPrompt("")).toBe("");
    expect(sanitizeRefinedPrompt("   ")).toBe("");
  });
});

describe("buildRefineAlterPromptMessages", () => {
  test("빈 입력이면 시드 예시와 시작문 지시를 넣는다", () => {
    const packed = buildRefineAlterPromptMessages({
      skill: "evaluation-draft",
      message: "",
      context: { pageType: "evaluation", label: "멘토평가" },
    });
    expect(packed.skill).toBe("evaluation-draft");
    expect(packed.systemInstruction).toContain(REFINE_ALTER_PROMPT_RULES);
    expect(packed.userContent).toContain("평가");
    expect(packed.userContent).toContain("수업 평가");
    expect(packed.userContent).toContain("시드 예시");
    expect(packed.userContent).toContain(
      ALTER_HOWTO_EXAMPLE_PROMPTS["evaluation-draft"][0]
    );
    expect(packed.userContent).toMatch(/없음/);
    expect(packed.systemInstruction).not.toMatch(/초안 JSON/);
  });

  test("사용자 메모가 있으면 의도를 유지하라고 넘긴다", () => {
    const packed = buildRefineAlterPromptMessages({
      skill: "document-draft",
      message: "저녁활동 안내문",
      context: {
        pageType: "document",
        writeMode: "create",
        label: "저녁활동",
      },
    });
    expect(packed.userContent).toContain("저녁활동 안내문");
    expect(packed.userContent).toContain("새로 작성");
    expect(packed.userContent).toContain("보드 문서 작성");
    expect(packed.systemInstruction).toMatch(/의도와 중요한 조건은 유지/);
  });

  test("현재 내용 발췌가 있으면 수정 근거로 넣는다", () => {
    const packed = buildRefineAlterPromptMessages({
      skill: "document-draft",
      message: "신청 방법만 보완",
      context: {
        pageType: "document",
        writeMode: "refine",
        label: "저녁활동",
        currentTitle: "저녁활동 이용 안내",
        currentExcerpt: "제목: 저녁활동 이용 안내\n목차: 공간 · 수칙\n공간 안내만 있고 신청 방법은 없음",
      },
    });
    expect(packed.userContent).toContain("## 현재 내용 발췌");
    expect(packed.userContent).toContain("신청 방법은 없음");
    expect(packed.userContent).toContain("현재 제목: 저녁활동 이용 안내");
    expect(packed.userContent).toContain("기존 내용 다듬기");
    expect(packed.systemInstruction).toMatch(/절·항목 이름/);
  });

  test("알 수 없는 스킬은 chat으로 떨어진다", () => {
    const packed = buildRefineAlterPromptMessages({
      skill: "unknown-skill",
      message: "정리해 줘",
    });
    expect(packed.skill).toBe("chat");
    expect(packed.userContent).toContain("챗봇");
  });
});
