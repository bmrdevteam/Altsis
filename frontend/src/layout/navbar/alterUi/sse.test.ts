import { TextDecoder, TextEncoder } from "util";
import { friendlyAlterError, readAlterSse, takeSseEvents } from "./sse";

if (typeof global.TextEncoder === "undefined") {
  (global as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
  (global as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder = TextDecoder;
}

describe("alter sse parser", () => {
  test("maps stable codes and keeps a Korean message", () => {
    expect(friendlyAlterError({ code: "AI_NOT_ENABLED", message: "AI_NOT_ENABLED" })).toBe(
      "AI 기능이 활성화되지 않았습니다."
    );
    expect(friendlyAlterError({ code: "NOT_FOUND", message: "SEASON_NOT_FOUND" })).toBe(
      "학기를 찾을 수 없습니다."
    );
    expect(friendlyAlterError({ message: "이번 주 할 일이 없습니다." })).toBe(
      "이번 주 할 일이 없습니다."
    );
    expect(friendlyAlterError({ code: "PROVIDER_ERROR" })).toBe(
      "AI 생성에 실패했습니다. 잠시 후 다시 시도해 주세요."
    );
    expect(friendlyAlterError({ code: "TOOL_ERROR", message: "TOOL_ERROR" })).toBe(
      "도구 실행에 실패했습니다."
    );
    expect(friendlyAlterError({ code: "LIMIT_REACHED" })).toBe("한도에 도달했습니다.");
    expect(friendlyAlterError({ code: "INVALID_INPUT" })).toBe("입력값을 확인해 주세요.");
    expect(friendlyAlterError({ code: "FORBIDDEN" })).toBe("권한이 없습니다.");
  });

  test("reads step, tool, done, and error events across chunks", async () => {
    const head = takeSseEvents(
      'event: step\ndata: {"message":"설정 확인 중..."}\n\nevent: tool\ndata: {"label":"할 일","status":"running"}\n\nevent: to'
    );
    expect(head.events.map((event) => event.step)).toEqual(["설정 확인 중...", "할 일 조회 중…"]);
    expect(head.rest).toBe("event: to");
    const tail = takeSseEvents(
      `${head.rest}ol\ndata: {"label":"할 일","status":"done","summary":"할 일 없음"}\n\n` +
        'event: done\ndata: {"message":"끝","skill":"agent"}\n\n'
    );
    expect(tail.events[0].step).toBe("할 일: 할 일 없음");
    expect(tail.events[1].done).toMatchObject({ message: "끝", skill: "agent" });

    const encoded = [
      new TextEncoder().encode(
        'event: error\ndata: {"code":"AI_NOT_ENABLED","message":"AI_NOT_ENABLED","conversationId":"c1"}\n\n'
      ),
    ];
    let index = 0;
    const body = {
      getReader: () => ({
        read: async () => {
          if (index >= encoded.length) return { done: true as const, value: undefined };
          const value = encoded[index];
          index += 1;
          return { done: false as const, value };
        },
      }),
    };
    await expect(
      readAlterSse({ ok: true, body: body as unknown as ReadableStream<Uint8Array> }, { onStep: () => {} })
    ).rejects.toThrow("AI 기능이 활성화되지 않았습니다.");
  });
});
