import Select from "components/select/Select";
import _ from "lodash";
import { useEffect, useState } from "react";

type Props = {
  subjectLabelList: string[];
  subjectDataList: string[][];
  defaultSubject?: string[];
  setSubject: React.Dispatch<React.SetStateAction<string[]>>;
};

const SubjectSelect = (props: Props) => {
  const [data, setData] = useState<{
    [key: string]: {
      selectedValue: string;
      options: { text: string; value: string }[];
    };
  }>({});

  useEffect(() => {
    if (
      props.subjectLabelList.length === 0 ||
      props.subjectDataList.length === 0
    )
      return;

    for (let label of props.subjectLabelList) {
      data[label] = {
        selectedValue: "",
        options: [{ text: "", value: "" }],
      };
    }

    data[props.subjectLabelList[0]].options = [
      {
        text: "",
        value: "",
      },
      ...Array.from(new Set(props.subjectDataList.map((data) => data[0]))).map(
        (data) => {
          return {
            text: data,
            value: data,
          };
        }
      ),
    ];

    if (
      props.defaultSubject &&
      _.find(props.subjectDataList, (rawData) =>
        _.isEqual(rawData, props.defaultSubject)
      )
    ) {
      for (let i = 0; i < props.subjectLabelList.length; i++) {
        data[props.subjectLabelList[i]].selectedValue = props.defaultSubject[i];
      }
      for (let i = 1; i < props.subjectLabelList.length; i++) {
        data[props.subjectLabelList[i]].options = [
          { text: "", value: "" },
          ...Array.from(
            new Set(
              _.filter(props.subjectDataList, (rawData) => {
                for (let j = 0; j < i; j++) {
                  if (
                    rawData[j] !== data[props.subjectLabelList[j]].selectedValue
                  )
                    return false;
                }
                return true;
              }).map((rawData) => rawData[i])
            )
          ).map((label) => {
            return {
              text: label,
              value: label,
            };
          }),
        ];
      }
    }

    setData({ ...data });
    return () => {};
  }, []);

  useEffect(() => {
    const subject = props.subjectLabelList.map(
      (label) => data[label]?.selectedValue ?? ""
    );
    props.setSubject(subject);
    return () => {};
  }, [data]);

  return (
    <div style={{ display: "flex", gap: "24px" }} key="subject-select">
      {props.subjectLabelList.map((label: string, idx: number) => {
        return (
          <Select
            key={label + data[label]?.selectedValue}
            appearence="flat"
            label={label}
            required
            onChange={(e: string) => {
              if (!data[label]) return;
              data[label].selectedValue = e;
              if (idx + 1 < props.subjectLabelList.length) {
                data[props.subjectLabelList[idx + 1]] = {
                  selectedValue: "",
                  options: [
                    { text: "", value: "" },
                    ...Array.from(
                      new Set(
                        _.filter(props.subjectDataList, (rawData) => {
                          for (let i = 0; i <= idx; i++) {
                            if (
                              rawData[i] !==
                              data[props.subjectLabelList[i]].selectedValue
                            )
                              return false;
                          }
                          return true;
                        }).map((rawData) => rawData[idx + 1])
                      )
                    ).map((label) => {
                      return {
                        text: label,
                        value: label,
                      };
                    }),
                  ],
                };
              }
              for (let i = idx + 2; i < props.subjectLabelList.length; i++) {
                data[props.subjectLabelList[i]] = {
                  selectedValue: "",
                  options: [{ text: "", value: "" }],
                };
              }
              setData({ ...data });
            }}
            options={data[label]?.options ?? []}
            defaultSelectedValue={data[label]?.selectedValue ?? ""}
          />
        );
      })}
    </div>
  );
};

export default SubjectSelect;
