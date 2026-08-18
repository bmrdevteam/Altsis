import { TextStyle } from "@tiptap/extension-text-style";
import { canonicalFontFamily, textStyleMarkTags } from "../editorFonts";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    styledTextStyle: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
      setFontFamily: (fontFamily: string) => ReturnType;
      unsetFontFamily: () => ReturnType;
    };
  }
}

/** 색·크기·폰트를 마크다운 HTML span으로 저장하고 setFontSize/setFontFamily를 제공한다 */
export const StyledTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: { fontSize?: string | null }) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
      fontFamily: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          canonicalFontFamily(element.style.fontFamily),
        renderHTML: (attributes: { fontFamily?: string | null }) => {
          if (!attributes.fontFamily) return {};
          return { style: `font-family: ${attributes.fontFamily}` };
        },
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark(this.name, { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain()
            .setMark(this.name, { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
      setFontFamily:
        (fontFamily: string) =>
        ({ chain }) =>
          chain().setMark(this.name, { fontFamily }).run(),
      unsetFontFamily:
        () =>
        ({ chain }) =>
          chain()
            .setMark(this.name, { fontFamily: null })
            .removeEmptyTextStyle()
            .run(),
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize: {
          open(
            _state: unknown,
            mark: { attrs: Record<string, string | null> }
          ) {
            return textStyleMarkTags(mark.attrs)?.open ?? "";
          },
          close(
            _state: unknown,
            mark: { attrs: Record<string, string | null> }
          ) {
            return textStyleMarkTags(mark.attrs)?.close ?? "";
          },
        },
        parse: {},
      },
    };
  },
});
