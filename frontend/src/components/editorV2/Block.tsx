import DividerBlock from "./blocks/DividerBlock";
import Paragraphblock from "./blocks/Paragraphblock";
import { IBlock, IParagraphBlock, IHeadingBlock } from "./types/dataTypes";
import style from "./editor.module.scss";
import HeadingBlock from "./blocks/HeadingBlock";

const Block = ({ data, editorId }: { data: IBlock; editorId: string }) => {
  const Wrapper = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
    return (
      <div id={`${editorId}-${data.id}`} className={style.block}>
        {children}
      </div>
    );
  };

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

    default:
      break;
  }
  return <div></div>;
};

export default Block;
