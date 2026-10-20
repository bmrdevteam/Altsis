import mongoose from "mongoose";
import { ALTER_MESSAGE_LINK_KINDS } from "../../src/models/alterMessageLinks.js";
import { alterGuideLinkSchema } from "../../src/models/AlterMessage.js";

describe("alter message links", () => {
  test("a web source validates so the answer can be stored", () => {
    expect(ALTER_MESSAGE_LINK_KINDS).toContain("web");
    expect(alterGuideLinkSchema.path("kind").enumValues).toContain("web");
    const parent = new mongoose.Schema({
      links: { type: [alterGuideLinkSchema], default: [] },
    });
    const Probe =
      mongoose.models.AlterWebLinkProbe ||
      mongoose.model("AlterWebLinkProbe", parent);
    const doc = new Probe({
      links: [{ kind: "web", title: "서울 날씨", path: "https://example.com/seoul" }],
    });
    expect(doc.validateSync()).toBeUndefined();
  });
});
