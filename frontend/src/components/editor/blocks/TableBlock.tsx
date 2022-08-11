import style from "../editor.module.scss";

const Cell = ({ children }: { children: string }) => {
  return (
    <div className={style.cell}>
      <div
        className={style.text}
        contentEditable={true}
        suppressContentEditableWarning={true}
      >
        {children}
      </div>
      <div className={style.col_resize}></div>
    </div>
  );
};

const TableBlock = () => {
  return (
    <div className={style.table}>
      <Cell>as1</Cell>
      <Cell>as2</Cell>
      <Cell>as3</Cell>
      <Cell>as4</Cell>
      <Cell>as5</Cell>
      <Cell>as65</Cell>
    </div>
  );
};

export default TableBlock;
