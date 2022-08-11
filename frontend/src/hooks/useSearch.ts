import _ from "lodash";
import { useCallback, useState } from "react";

interface IFilterItem {
  id: string;
  key: string | string[];
  operator: "=" | ">" | "<";
  value: string;
}

export default function useSearch(data: any) {
  const [filters, setFilters] = useState<IFilterItem[]>([]);

  const result = useCallback(() => {
    if (filters.length < 1) {
      return data;
    }
    return data.filter((value: any) => {
      let x = 0;

      filters?.map((filter) => {
        switch (filter.operator) {
          case "=":
            x += _.get(value, filter.key)
              .replaceAll(" ", "")
              .includes(filter.value.replaceAll(" ", ""))
              ? 1
              : 0;
            break;
          case "<":
            x +=
              parseFloat(_.get(value, filter.key)) < parseFloat(filter.value)
                ? 1
                : 0;
            break;
          default:
            break;
        }
      });

      //AND
      // return x === filters.length;

      //OR

      return x > 0;
    });
  }, [filters, data]);

  function addFilterItem(item: IFilterItem) {
    setFilters((prev) => [...prev.filter((val) => val.id !== item.id), item]);
    return filters;
  }
  function deleteFilterItem(item: IFilterItem) {
    setFilters((prev) => prev.filter((value) => value !== item));
    return filters;
  }

  return { deleteFilterItem, addFilterItem, filters, result };
}
