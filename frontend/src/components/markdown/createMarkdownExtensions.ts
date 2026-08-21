import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import Mention from "@tiptap/extension-mention";
import { ResizableImage } from "./extensions/resizableImage";
import { InlineCheckbox } from "./extensions/inlineCheckbox";
import {
  SlashCommand,
  type SlashDialogActions,
} from "./extensions/slashCommand";
import { HtmlEmbed } from "./extensions/htmlEmbed";
import { MathInline, MathBlock } from "./extensions/mathExtension";
import { createMentionSuggestion } from "./extensions/mentionSuggestion";
import { tableCellStyleAttributes } from "./tableCellAttributes";
import { StyledTable } from "./tableMarkdown";
import { AlignedHeading, AlignedParagraph } from "./extensions/alignedBlocks";
import { StyledTextStyle } from "./extensions/styledTextStyle";

export type CreateMarkdownExtensionsOptions = {
  /** false면 슬래시·플레이스홀더 없이 조회용 스키마만 구성 */
  editable?: boolean;
  placeholder?: string;
  searchMentionUsers?: (query: string) => Promise<any[]>;
  getSlashActions?: () => SlashDialogActions;
};

const YoutubeMarkdown = Youtube.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(`![youtube](${node.attrs.src})`);
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },
});

const MentionMarkdown = Mention.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(`@[${node.attrs.label || ""}](${node.attrs.id || ""})`);
        },
        parse: {},
      },
    };
  },
});

/**
 * 편집기·조회 화면이 같은 TipTap 스키마를 쓰도록 확장을 한곳에서 만든다.
 */
export const createMarkdownExtensions = (
  options: CreateMarkdownExtensionsOptions = {}
): AnyExtension[] => {
  const {
    editable = true,
    placeholder = "내용을 입력하세요...",
    searchMentionUsers,
    getSlashActions,
  } = options;

  const extensions: AnyExtension[] = [
    StarterKit.configure({
      heading: false,
      paragraph: false,
    }),
    AlignedParagraph,
    AlignedHeading,
    Markdown.configure({
      html: true,
      tightLists: true,
      bulletListMarker: "-",
      transformPastedText: true,
      transformCopiedText: false,
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    InlineCheckbox,
    Link.configure({
      openOnClick: !editable,
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    }),
    ResizableImage,
    YoutubeMarkdown.configure({
      controls: true,
      nocookie: true,
    }),
    TextAlign.configure({
      types: ["heading", "paragraph"],
      alignments: ["left", "center", "right", "justify"],
    }),
    StyledTextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    StyledTable.configure({ resizable: true }),
    TableRow,
    TableCell.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          ...tableCellStyleAttributes,
        };
      },
    }),
    TableHeader.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          ...tableCellStyleAttributes,
        };
      },
    }),
    HtmlEmbed,
    MathInline,
    MathBlock,
  ];

  if (editable) {
    extensions.push(Placeholder.configure({ placeholder }));
    if (getSlashActions) {
      extensions.push(
        SlashCommand.configure({
          getActions: getSlashActions,
        })
      );
    }
  }

  if (searchMentionUsers) {
    extensions.push(
      MentionMarkdown.configure({
        HTMLAttributes: { class: "mention-chip" },
        suggestion: createMentionSuggestion(searchMentionUsers),
      })
    );
  }

  return extensions;
};
