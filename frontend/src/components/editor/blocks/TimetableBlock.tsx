import React from "react";
import { ITimetableBlock } from "../type";
import style from "../editor.module.scss";

const TimetableBlock = ({ block }: { block: ITimetableBlock }) => {
  return (
    <table className={style.timetable}>
      <tbody>
        <tr>
          <th>시간</th>
          <th>구분</th>
          <th>월</th>
          <th>화</th>
          <th>수</th>
          <th>목</th>
          <th>금</th>
        </tr>
        <tr>
          <th>07:00-07:30</th>
          <th>아침활동</th>
          <td align="center" colSpan={5}>
            아침활동
          </td>
        </tr>
        <tr>
          <th>07:30-08:30</th>
          <th>아침식사</th>
          <td align="center" colSpan={5}>
            아침식사
          </td>
        </tr>
        <tr>
          <th>08:30-09:00</th>
          <th>아침묵상</th>
          <td align="center">묵상</td>
          <td align="center">묵상</td>
          <td align="center">예배</td>
          <td align="center">묵상</td>
          <td align="center">묵상</td>
        </tr>
        <tr>
          <th>09:00-09:35</th>
          <th>1교시</th>
          <td align="center">체크인</td>
          <td align="center">아침독서</td>
          <td align="center">예배</td>
          <td align="center">아침독서</td>
          <td align="center">체크아웃</td>
        </tr>
        <tr>
          <th>09:45-10:30</th>
          <th>2교시</th>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
        </tr>
        <tr>
          <th>10:35-11:20</th>
          <th>3교시</th>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
        </tr>
        <tr>
          <th>11:25-12:10</th>
          <th>4교시</th>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
        </tr>
        <tr>
          <th>12:10-13:10</th>
          <th>점심식사</th>
          <td align="center" colSpan={5}>
            점심식사
          </td>
        </tr>
        <tr>
          <th>13:10-13:55</th>
          <th>5교시</th>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" /></td>
        </tr>
        <tr>
          <th>14:00-14:45</th>
          <th>6교시</th>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" /></td>
        </tr>
        <tr>
          <th>14:50-15:35</th>
          <th>7교시</th>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center">자치</td>
          <td align="center"><input type="checkbox" /></td>
        </tr>
        <tr>
          <th>15:40-16:25</th>
          <th>8교시</th>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center">자치</td>
          <td align="center"><input type="checkbox" /></td>
        </tr>
        <tr>
          <th>16:30-17:15</th>
          <th>9교시</th>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center">재량</td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center">동아리</td>
          <td align="center"><input type="checkbox" /></td>
        </tr>
        <tr>
          <th>17:20-18:05</th>
          <th>10교시</th>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center">재량</td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center">동아리</td>
          <td align="center"><input type="checkbox" /></td>
        </tr>
        <tr>
          <th>18:05-18:55</th>
          <th>저녁식사</th>
          <td align="center" colSpan={4}>
            저녁식사
          </td>
          <td align="center"><input type="checkbox" /></td>
        </tr>
        <tr>
          <th rowSpan={2}>19:00-21:00</th>
          <th rowSpan={2}>저녁활동</th>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" /></td>
        </tr>
        <tr>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" defaultChecked/></td>
          <td align="center"><input type="checkbox" /></td>
        </tr>
        <tr>
          <th>21:00-21:20</th>
          <th>저널및반성</th>
          <td align="center" colSpan={4}>
            저널및반성
          </td>
          <td align="center"><input type="checkbox" /></td>
        </tr>
        <tr>
          <th>21:20-21:30</th>
          <th>청소시간</th>
          <td align="center" colSpan={4}>
            청소시간
          </td>
          <td align="center"><input type="checkbox" /></td>
        </tr>
      </tbody>
    </table>
  );
};

export default TimetableBlock;
