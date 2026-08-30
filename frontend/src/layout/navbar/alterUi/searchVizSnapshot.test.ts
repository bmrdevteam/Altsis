import {
  SEARCH_VIZ_SNAPSHOT_MAX,
  SEARCH_VIZ_SNAPSHOT_TYPE,
  buildSearchVizSnapshotTailScript,
  createSearchVizSnapshotToken,
  isPngDataUrl,
  readSearchVizSnapshotMessage,
  waitForSearchVizSnapshot,
} from "./searchVizSnapshot";

const TOKEN = "aabbccddeeff00112233445566778899";
const PNG = "data:image/png;base64,iVBORw0KGgo=";

describe("searchVizSnapshot", () => {
  test("createSearchVizSnapshotToken is hex", () => {
    expect(createSearchVizSnapshotToken()).toMatch(/^[a-f0-9]{32}$/i);
  });

  test("isPngDataUrl rejects empty jpeg and oversized", () => {
    expect(isPngDataUrl(PNG)).toBe(true);
    expect(isPngDataUrl("")).toBe(false);
    expect(isPngDataUrl("data:image/jpeg;base64,xx")).toBe(false);
    expect(isPngDataUrl(`data:image/png;base64,${"a".repeat(SEARCH_VIZ_SNAPSHOT_MAX)}`)).toBe(
      false
    );
  });

  test("readSearchVizSnapshotMessage requires type token and png", () => {
    expect(readSearchVizSnapshotMessage(null, TOKEN)).toBe(null);
    expect(readSearchVizSnapshotMessage({ type: SEARCH_VIZ_SNAPSHOT_TYPE }, TOKEN)).toBe(
      null
    );
    expect(
      readSearchVizSnapshotMessage(
        { type: SEARCH_VIZ_SNAPSHOT_TYPE, token: "other", dataUrl: PNG },
        TOKEN
      )
    ).toBe(null);
    expect(
      readSearchVizSnapshotMessage(
        {
          type: SEARCH_VIZ_SNAPSHOT_TYPE,
          token: TOKEN,
          dataUrl: "data:image/gif,xx",
        },
        TOKEN
      )
    ).toBe(null);
    expect(
      readSearchVizSnapshotMessage(
        { type: SEARCH_VIZ_SNAPSHOT_TYPE, token: TOKEN, dataUrl: PNG },
        TOKEN
      )
    ).toEqual({ dataUrl: PNG });
    expect(
      readSearchVizSnapshotMessage(
        { type: SEARCH_VIZ_SNAPSHOT_TYPE, token: TOKEN, failed: true },
        TOKEN
      )
    ).toEqual({ failed: true });
    expect(readSearchVizSnapshotMessage({ type: SEARCH_VIZ_SNAPSHOT_TYPE, token: TOKEN, dataUrl: PNG }, "")).toBe(
      null
    );
  });

  test("buildSearchVizSnapshotTailScript embeds token and rejects junk", () => {
    const script = buildSearchVizSnapshotTailScript(TOKEN);
    expect(script).toContain(SEARCH_VIZ_SNAPSHOT_TYPE);
    expect(script).toContain(TOKEN);
    expect(() => buildSearchVizSnapshotTailScript("not-hex!")).toThrow(
      "invalid snapshot token"
    );
  });

  test("waitForSearchVizSnapshot resolves when ready or after timeout", async () => {
    await waitForSearchVizSnapshot(() => true, 200);
    const started = Date.now();
    await waitForSearchVizSnapshot(() => false, 80);
    expect(Date.now() - started).toBeGreaterThanOrEqual(80);
  });
});
