import PrepHint from "./PrepHint";
import style from "../Alter.module.scss";

const PrepHintRow = ({ text }: { text: string }) => (
  <div className={style.prepHintRow}>
    <PrepHint text={text} />
    <span className={style.prepHintRowLabel}>이용 안내</span>
  </div>
);

export default PrepHintRow;
