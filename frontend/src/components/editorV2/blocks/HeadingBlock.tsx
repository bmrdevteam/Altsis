import { IHeadingBlock } from "../types/dataTypes";
import style from "../editor.module.scss";

const HeadingBlock = ({ block }: { block: IHeadingBlock }) => {
  return (
    <div
      contentEditable={true}
      suppressContentEditableWarning={true}
      className={style.heading}
    >
      {block.data.text}
    </div>
  );
};

export default HeadingBlock;
