import React from "react";
import { ITimetableBlock } from "../type";
import style from "../editor.module.scss";

const TimetableBlock = ({ block }: { block: ITimetableBlock }) => {
  return (
    <table className={style.timetable}>
      <tbody>
        <tr>
          <td>시간/교시</td>
        </tr>
        <tr>
          <td>
            <input type="time" /> ~ <input type="time" />
          </td>
          <td>1교시</td>
          <td>3</td>
          <td>4</td>
        </tr>
        <tr>
          <td>
            <input type="time" /> ~ <input type="time" />
          </td>
          <td>2교시</td>
          <td>3</td>
          <td>4</td>
        </tr>
        <tr>
          <td>
            <input type="time" /> ~ <input type="time" />
          </td>
          <td>2</td>
          <td>3</td>
          <td>4</td>
        </tr>
      </tbody>
    </table>
  );
};

export default TimetableBlock;
