
import style from "../../editor.module.scss";
import { useEditor } from "../../functions/editorContext";
import TableCellBlock from "./ParagraphCell";

type Props = { index: number };

const TableBlock = (props: Props) => {
  const { getBlock, setCurrentCell ,setCurrentCellIndex} = useEditor();
  const block = getBlock(props.index);

  const tableStyles = {};

  const SetColumn = () => {
    let result = [];
    for (let i = 0; i < 20; i++) {
      result.push(<col width="5%" key={i} />);
    }
    return <colgroup>{result}</colgroup>;
  };
  // console.log(
  //   Object.entries(block.data?.table).sort((a, b) => a[0].localeCompare(b[0]))
  // );
  console.log("unsorted", block.data?.table);

  return (
    <div className={style.block}>
      <table className={style.table}>
        <SetColumn />
        <tbody>
          {block.data?.table &&
            Object.entries(block.data?.table).map(
              (value: any, index: number) => {
                return (
                  <tr key={index}>
                    {value[1].map((val: any, ind: number) => {
                      return (
                        <td
                          key={ind}
                          id={val.id}
                          onClick={() => {
                            setCurrentCell(val.id);
                            setCurrentCellIndex(value[0],ind)
                            console.log();
                          }}
                          colSpan={5}
                          rowSpan={val.data?.rowSpan}
                        >
                          <TableCellBlock />
                        </td>
                      );
                    })}
                  </tr>
                );
              }
            )}
        </tbody>
      </table>
    </div>
  );
};

export default TableBlock;
