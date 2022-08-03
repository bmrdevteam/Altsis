import _ from "lodash";
import { useCallback, useState } from "react";

interface IFilterItem {
  key: string | string[];
  operator: string;
  value: string;
}

export default function useSearch(data: any) {
  const [filters, setFilters] = useState<IFilterItem[]>([
    { key: "name", operator: "=", value: "1" },
    { key: "id", operator: "=", value: "asdf" },
  ]);

  const result = useCallback(() => {

    
    return data.filter((value: any) => {
      let x = 0;


      filters.map((filter) => {
        switch (filter.operator) {
          case "=":
            x += _.get(value, filter.key) === filter.value ? 1 : 0;
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
    setFilters((prev) => [...prev, item]);
    return filters;
  }
  function deleteFilterItem(item: IFilterItem) {
    setFilters((prev) => prev.filter((value) => value !== item));
    return filters;
  }

  return { deleteFilterItem, addFilterItem, filters, result };
}
