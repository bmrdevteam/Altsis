/**
 * @file
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * - useSearch.result
 * - useSearch.addFilterItem
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 * - search with 'AND' functions
 * - search with '>'
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 * - useSearch.deleteFilter
 * - search with '>='
 * - search with '<='
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 * - add examples to the js doc
 */

import _, { add } from "lodash";
import { useCallback, useState } from "react";

interface IFilterItem {
  id: string;
  key: string | string[];
  operator: "=" | ">" | "<";
  value: string;
}
/**
 * useSearch hook to perform advanced search
 *
 * @param data
 *
 * @returns {} {deleteFilterItem, addFilterItem, filters, result };
 *
 * @example
 *
 * @version 2.1 added feature to eliminate all spaces when searching ("item" === "i t  e m ")
 * @version 2.0 enables advanced search
 * @version 1.0 initial version (enables search with === )
 */
export default function useSearch(data: any) {
  /**
   * @constant useState sets the filters for the search
   */
  const [filters, setFilters] = useState<IFilterItem[]>([]);

  /**
   * function that returns the searched result updates only when either [filters , data] are changed
   *
   * @returns result of the filtered array
   */
  const result = useCallback(() => {
    /**
     * if the filter is empty return the raw data
     */

    if (filters.length < 1) {
      return data;
    }
    /**
     * return the filtrated data
     */
    return data.filter((value: any) => {
      let counter = 0;

      /**
       * map through the filters and check if theres a valid value and ++ the counter
       */
      filters?.map((filter) => {
        /**
         * switch according to the operator in the filter item
         */
        switch (filter.operator) {
          /**
           * case '=' ++ the counter if the given-value matches the filter-value
           */
          case "=":
            counter += _.get(value, filter.key)
              .replaceAll(" ", "")
              .includes(filter.value.replaceAll(" ", ""))
              ? 1
              : 0;
            break;
          /**
           * case '=' ++ the counter if the given-value is smaller than the filter-value
           */
          case "<":
            counter +=
              parseFloat(_.get(value, filter.key)) < parseFloat(filter.value)
                ? 1
                : 0;
            break;
          /**
           * default do nothing
           */
          default:
            break;
        }
      });

      /**
       * returns true if the counter is bigger than 0 -> counter has a matching value
       */
      return counter > 0;
    });
  }, [filters, data]);

  /**
   * function that adds a filter
   *
   * @param {IFilterItem} item
   *
   * @returns
   *
   * @example
   */
  function addFilterItem(item: IFilterItem) {
    /**
     * setting the filters
     *
     * if filter has the same id, delete the filter then add the new filter - updating filters
     * if there is no matching id the function will just add the new filter
     */

    setFilters((prev) => [...prev.filter((val) => val.id !== item.id), item]);
    return filters;
  }
  /**
   *
   * function that deletes a filter
   *
   * @param {IFilterItem} item
   *
   * @returns
   *
   * @example
   */
  function deleteFilterItem(item: IFilterItem) {
    /**
     * setting the filters
     *
     * in DEVELOPMENT
     */
    setFilters((prev) => prev.filter((value) => value.id !== item.id));

    return filters;
  }

  function addANDFilterItem(item: IFilterItem) {
    /**
     * set AND filters
     */
  }
  function addORFilterItem(item: IFilterItem) {
    /**
     * set OR filters
     *
     * if filter has the same id, delete the filter then add the new filter - updating filters
     * if there is no matching id the function will just add the new filter
     */

    setFilters((prev) => [...prev.filter((val) => val.id !== item.id), item]);
    return filters;
  }

  return { addFilterItem, filters, result };
}
