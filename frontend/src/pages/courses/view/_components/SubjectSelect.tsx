import Select from "components/select/Select";
import _ from "lodash";
import { useEffect, useState, useCallback } from "react";

type Props = {
  subjectLabelList: string[];
  subjectDataList: string[][];
  defaultSubject?: string[];
  setSubject: React.Dispatch<React.SetStateAction<string[]>>;
};

const SubjectSelect = ({
  subjectLabelList,
  subjectDataList,
  defaultSubject,
  setSubject,
}: Props) => {
  const [data, setData] = useState<{
    [key: string]: {
      selectedValue: string;
      options: { text: string; value: string }[];
    };
  }>({});

  useEffect(() => {
    if (subjectLabelList.length === 0 || subjectDataList.length === 0) return;

    const newData: typeof data = {};

    for (const label of subjectLabelList) {
      newData[label] = {
        selectedValue: "",
        options: [{ text: "", value: "" }],
      };
    }

    newData[subjectLabelList[0]].options = [
      {
        text: "",
        value: "",
      },
      ...Array.from(new Set(subjectDataList.map((data) => data[0]))).map(
        (data) => ({
          text: data,
          value: data,
        })
      ),
    ];

    if (
      defaultSubject &&
      _.find(subjectDataList, (rawData) => _.isEqual(rawData, defaultSubject))
    ) {
      for (let i = 0; i < subjectLabelList.length; i++) {
        newData[subjectLabelList[i]].selectedValue = defaultSubject[i];
      }
      for (let i = 1; i < subjectLabelList.length; i++) {
        newData[subjectLabelList[i]].options = [
          { text: "", value: "" },
          ...Array.from(
            new Set(
              _.filter(subjectDataList, (rawData) => {
                for (let j = 0; j < i; j++) {
                  if (
                    rawData[j] !== newData[subjectLabelList[j]].selectedValue
                  )
                    return false;
                }
                return true;
              }).map((rawData) => rawData[i])
            )
          ).map((label) => ({
            text: label,
            value: label,
          })),
        ];
      }
    }

    setData(newData);
  }, [subjectLabelList, subjectDataList, defaultSubject]);

  useEffect(() => {
    const subject = subjectLabelList.map(
      (label) => data[label]?.selectedValue ?? ""
    );
    setSubject(subject);
  }, [data, subjectLabelList, setSubject]);

  const handleSelectChange = useCallback((label: string, idx: number, value: string) => {
    setData((prevData) => {
      const newData = _.cloneDeep(prevData);
      if (!newData[label]) return prevData;

      newData[label].selectedValue = value;

      if (idx + 1 < subjectLabelList.length) {
        newData[subjectLabelList[idx + 1]] = {
          selectedValue: "",
          options: [
            { text: "", value: "" },
            ...Array.from(
              new Set(
                _.filter(subjectDataList, (rawData) => {
                  for (let i = 0; i <= idx; i++) {
                    if (
                      rawData[i] !==
                      newData[subjectLabelList[i]].selectedValue
                    )
                      return false;
                  }
                  return true;
                }).map((rawData) => rawData[idx + 1])
              )
            ).map((label) => ({
              text: label,
              value: label,
            })),
          ],
        };
      }

      for (let i = idx + 2; i < subjectLabelList.length; i++) {
        newData[subjectLabelList[i]] = {
          selectedValue: "",
          options: [{ text: "", value: "" }],
        };
      }
      return newData;
    });
  }, [subjectLabelList, subjectDataList]);


  return (
    <div style={{ display: "flex", gap: "24px" }} key="subject-select">
      {subjectLabelList.map((label: string, idx: number) => {
        return (
          <Select
            key={label + data[label]?.selectedValue}
            appearence="flat"
            label={label}
            required
            onChange={(e: string) => handleSelectChange(label, idx, e)}
            options={data[label]?.options ?? []}
            defaultSelectedValue={data[label]?.selectedValue ?? ""}
          />
        );
      })}
    </div>
  );
};

export default SubjectSelect;