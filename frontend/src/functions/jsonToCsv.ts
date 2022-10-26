export default function jsonToCsv(json: any) {
  const items = json.items;
  const replacer = (key: any, value: any) => (value === null ? "" : value); // specify how you want to handle null values here
  const header = Object.keys(items[0]);
  const csv = [
    header.join(","), // header row first
    ...items.map((row: any) =>
      header
        .map((fieldName) => JSON.stringify(row[fieldName], replacer))
        .join(",")
    ),
  ].join("\r\n");

  console.log(csv);
  return csv;
}
