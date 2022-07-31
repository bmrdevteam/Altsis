import DividerBlock from "./blocks/DividerBlock";
import Paragraphblock from "./blocks/Paragraphblock";
import { IBlock, IParagraphBlock, IHeadingBlock } from "./types/dataTypes";
import style from "./editor.module.scss";
import HeadingBlock from "./blocks/HeadingBlock";
import TableBlock from "./blocks/TableBlock";
import { useEffect } from "react";

const Block = ({
  data,
  editorId,
  editor,
}: {
  data: IBlock;
  editorId: string;
  editor: {
    editorData: IBlock[];
    addBlock: (insertAfter?: number | undefined) => void;
    deleteBlock: (blockId: string) => void;
  };
}) => {
  const Wrapper = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
    return (
      <div
        id={`${editorId}-${data.id}`}
        className={style.block}
        onDoubleClick={() => {
          editor.deleteBlock(data.id);
        }}
      >
        {children}
      </div>
    );
  };
  useEffect(() => {
    console.log(data);
    return () => {};
  }, []);

  switch (data.type) {
    case "heading":
      return (
        <Wrapper>
          <HeadingBlock block={data as IHeadingBlock} />
        </Wrapper>
      );

    case "paragraph":
      return (
        <Wrapper>
          <Paragraphblock block={data as IParagraphBlock} />
        </Wrapper>
      );
    case "divider":
      return (
        <Wrapper>
          <DividerBlock />
        </Wrapper>
      );
    case "table":
      return (
        <Wrapper>
          <TableBlock />
        </Wrapper>
      );

    default:
      break;
  }
  return <div></div>;
};

export default Block;
