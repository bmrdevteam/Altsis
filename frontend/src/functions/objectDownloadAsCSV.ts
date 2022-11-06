import { isArray, isObject } from "lodash";

export default function objectDownloadAsCSV(data: any) {
  const items = data;
  const replacer = (key: any, value: any) => {
    if (value === null) {
      return "";
    }
    if (isArray(value)) {
      if (isObject(value[0])) {
        return "";
      }
      return value.toString().replace(",", "");
    }
    if (isObject(value)) {
      return JSON.stringify(value).replace(",", "");
    }
    return value;
  };
  const header = Object.keys(items[0]);

  const csv = [
    header.join(","), // header row first
    ...items.map((row: any) =>
      header
        .map((fieldName) => JSON.stringify(row[fieldName], replacer))
        .join(",")
    ),
  ].join("\r\n");

  const csvString = `data:text/csv;charset=utf-8,${encodeURI(csv)}`;
  const link = document.createElement("a");
  link.href = csvString;
  link.download = "data.csv";
  link.click();
}
