export default function dateFormat(date: Date) {
  let month = date.getMonth() + 1;
  let day = date.getDate();
  let hour = date.getHours();
  let minute = date.getMinutes();
  let second = date.getSeconds();

  const mm = month >= 10 ? month : "0" + month;
  const dd = day >= 10 ? day : "0" + day;
  const hh = hour >= 10 ? hour : "0" + hour;
  const min = minute >= 10 ? minute : "0" + minute;
  const sec = second >= 10 ? second : "0" + second;

  return (
    date.getFullYear() + "-" + mm + "-" + dd + " " + hh + ":" + min + ":" + sec
  );
}
