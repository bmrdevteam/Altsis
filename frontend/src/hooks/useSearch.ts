export default function useSearch({
  array,
  searchTerm,
  searchValue,
}: {
  array: Array<any>;
  searchTerm: string | number | undefined;
  searchValue?: string;
}) {
  let result = array;
  result = array.filter((value) => {
    if (searchTerm === "" || searchTerm === undefined || searchTerm === null) {
      return value;
    }
    if (searchValue === "" || searchValue !== undefined) {
      return value[searchValue]
        .toLowerCase()
        .includes(searchTerm.toString().toLowerCase());
    } else {
      try {
        return value
          .toLowerCase()
          .includes(searchTerm.toString().toLowerCase());
      } catch (error) {
        return value
      }
    }
  });
  return result;
}
