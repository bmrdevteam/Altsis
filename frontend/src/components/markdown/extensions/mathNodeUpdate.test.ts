import { applyMathNodeUpdate } from "./mathNodeUpdate";

const node = (name: string, latex?: string) => ({
  type: { name },
  attrs: latex === undefined ? {} : { latex },
});

describe("applyMathNodeUpdate", () => {
  test("타입이 다르면 false이고 render하지 않는다", () => {
    const render = jest.fn();
    expect(
      applyMathNodeUpdate("mathInline", node("paragraph", "x"), "x", render)
    ).toBe(false);
    expect(render).not.toHaveBeenCalled();
  });

  test("latex가 같으면 true이고 render하지 않는다", () => {
    const render = jest.fn();
    expect(
      applyMathNodeUpdate(
        "mathInline",
        node("mathInline", "\\rightarrow"),
        "\\rightarrow",
        render
      )
    ).toBe(true);
    expect(render).not.toHaveBeenCalled();
  });

  test("latex가 바뀌면 true이고 render를 한 번 부른다", () => {
    const render = jest.fn();
    expect(
      applyMathNodeUpdate(
        "mathBlock",
        node("mathBlock", "E = mc^2"),
        "x^2",
        render
      )
    ).toBe(true);
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith("E = mc^2");
  });

  test("latex attr이 없으면 빈 문자열로 비교한다", () => {
    const render = jest.fn();
    expect(
      applyMathNodeUpdate("mathInline", node("mathInline"), "", render)
    ).toBe(true);
    expect(render).not.toHaveBeenCalled();
    expect(
      applyMathNodeUpdate("mathInline", node("mathInline"), "a", render)
    ).toBe(true);
    expect(render).toHaveBeenCalledWith("");
  });
});
