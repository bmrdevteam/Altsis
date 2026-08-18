import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import { serializeAlignedBlock } from "../alignedBlockMarkdown";

export const AlignedParagraph = Paragraph.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          serializeAlignedBlock(state, node, "paragraph");
        },
        parse: {},
      },
    };
  },
});

export const AlignedHeading = Heading.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          serializeAlignedBlock(state, node, "heading");
        },
        parse: {},
      },
    };
  },
}).configure({ levels: [1, 2, 3, 4, 5, 6] });
