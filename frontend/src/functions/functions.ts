import { isArray, isObject, find } from "lodash";
import * as xlsx from "xlsx";

/**
 * Generates a random string of a given length.
 *
 * @param {number} length - The length of the string to generate.
 * @return {string} The generated string.
 */
export function generateRandomId(length: number) {
  var result = ""; // initialize an empty result string
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"; // define the set of characters to use for the random string
  var charactersLength = characters.length; // get the length of the character set
  for (var i = 0; i < length; i++) {
    // loop through the desired length
    result += characters.charAt(Math.floor(Math.random() * charactersLength)); // add a random character from the character set to the result string
  }
  return result as string; // return the result string as a string type
}

const pattern: any = {
  userId: "^[a-z|A-Z|0-9]{4,20}$", // user ID must be 4-20 characters long and contain only letters and digits
  userName: "^[a-z|A-Z|0-9|ㄱ-ㅎ|ㅏ-ㅣ|가-힣]{2,20}$", // user name must be 2-20 characters long and contain only letters, digits, and certain Korean characters
  password: "^(?=.*?[!@#$%^&*()])[a-z|A-Z|0-9|!@#$%^&*()]{8,26}$", // password must be 8-26 characters long and contain at least one special character
  email:
    "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$", // email must contain an '@' symbol
  tel: "^[0-9]{3}-[0-9]{4}-[0-9]{4}$", // phone number must be in the format 'XXX-XXXX-XXXX',

  academyId: "^[a-z|A-Z|0-9]{2,20}$",
  academyName: "^[a-z|A-Z|0-9|ㄱ-ㅎ|ㅏ-ㅣ|가-힣| ]{2,20}$",
  adminId: "^[a-z|A-Z|0-9]{4,20}$", // user ID must be 4-20 characters long and contain only letters and digits
  adminName: "^[a-z|A-Z|0-9|ㄱ-ㅎ|ㅏ-ㅣ|가-힣]{2,20}$", // user name must be 2-20 characters long and contain only letters, digits, and certain Korean characters,

  schoolId: "^[a-z|A-Z|0-9]{2,20}$",
  schoolName: "^[a-z|A-Z|0-9|ㄱ-ㅎ|ㅏ-ㅣ|가-힣| ]{2,20}$",
};

/**
 * Validates a string based on a given type.
 *
 * @param {string} type - The type of validation to perform.
 * @param {string} content - The string to validate.
 * @return {boolean} `true` if the string is valid, `false` otherwise.
 */
export function validate(type: string, content: string) {
  if (pattern[type]) return new RegExp(pattern[type]).test(content); // test the content against the regex pattern for the given type
  return false; // return false if the type is not recognized
}

/**
 * Formats a given Date object as a string in the format 'YYYY-MM-DD HH:MM:SS'.
 *
 * @param {Date} date - The Date object to format.
 * @return {string} The formatted date string.
 */
export function dateFormat(date: Date, opts?: "YYYY-MM-DD") {
  let month = date.getMonth() + 1;
  let day = date.getDate();
  let hour = date.getHours();
  let minute = date.getMinutes();
  let second = date.getSeconds();

  const mm = month >= 10 ? month : "0" + month; // Ensure two digits for month
  const dd = day >= 10 ? day : "0" + day; // Ensure two digits for day
  const hh = hour >= 10 ? hour : "0" + hour; // Ensure two digits for hour
  const min = minute >= 10 ? minute : "0" + minute; // Ensure two digits for minute
  const sec = second >= 10 ? second : "0" + second; // Ensure two digits for second

  if (opts === "YYYY-MM-DD") {
    return date.getFullYear() + "-" + mm + "-" + dd;
  }
  return (
    date.getFullYear() + "-" + mm + "-" + dd + " " + hh + ":" + min + ":" + sec
  );
}

/**
 * Downloads an object as a CSV file.
 *
 * @param {any} data - The object to download as a CSV.
 */
export function objectDownloadAsCSV(data: any) {
  const items = data; // extract the items array from the data object
  const replacer = (key: any, value: any) => {
    if (value === null) {
      // handle null values
      return "";
    }
    if (isArray(value)) {
      // handle arrays
      if (isObject(value[0])) {
        // skip arrays of objects
        return "";
      }
      return value.toString().replace(",", ""); // remove commas from array values
    }
    if (isObject(value)) {
      // handle objects
      return JSON.stringify(value).replace(",", ""); // remove commas from object values
    }
    return value; // return other values as-is
  };
  const header = Object.keys(items[0]); // extract the keys of the first item in the array as the header row

  const csv = [
    header.join(","), // header row first
    ...items.map((row: any) =>
      header
        .map((fieldName) => JSON.stringify(row[fieldName], replacer))
        .join(",")
    ),
  ].join("\r\n"); // join the header row and item rows with newline characters

  const csvString = `data:text/csv;charset=utf-8,${encodeURI(csv)}`; // create a CSV string with proper MIME type
  const link = document.createElement("a"); // create a link element
  link.href = csvString; // set the link's href to the CSV string
  link.download = "data.csv"; // set the download file name
  link.click(); // trigger a click on the link to download the CSV file
}

/**
 * Downloads an object as a JSON file.
 *
 * @param {any} data - The object to download as JSON.
 */
export function objectDownloadAsJson(data: any) {
  const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
    JSON.stringify(data)
  )}`; // create a JSON string with the proper MIME type
  const link = document.createElement("a"); // create a link element
  link.href = jsonString; // set the link's href to the JSON string
  link.download = data.title ? data.title + ".json" : "data.json"; // set the download file name
  link.click(); // trigger a click on the link to download the JSON file
}

/**
 * Downloads an object as a xlsx file.
 *
 * @param {any} data - The object to download as JSON.
 */
export function objectDownloadAsXlxs(props: {
  title?: string;
  sheets: {
    title?: string;
    header: string[];
    data: any[];
  }[];
}) {
  const wb = xlsx.utils.book_new();
  for (let i = 0; i < props.sheets.length; i++) {
    const sheet = props.sheets[i];
    const ws = xlsx.utils.json_to_sheet(
      sheet.data.map((data) => {
        const row: { [key: string]: string } = {};
        for (let hd of sheet.header) {
          row[hd] = data[hd];
        }
        return row;
      })
    );
    xlsx.utils.book_append_sheet(wb, ws, sheet.title ?? `sheet${i + 1}`);
  }

  xlsx.writeFile(wb, props.title ? props.title + ".xlsx" : "data.xlsx");
}

interface FlattenableObject {
  [key: string]: any;
}

/**
 * Flattens an object, converting all nested properties into a single level object
 * with keys consisting of the concatenated property names.
 *
 * @param obj - The object to flatten.
 * @param prefix - The prefix to use for the keys of the flattened object.
 * @returns The flattened object.
 */
export function flattenObject(
  obj: FlattenableObject,
  prefix = ""
): FlattenableObject {
  // Create a new object to store the flattened key-value pairs
  const result: FlattenableObject = {};

  // Loop through the properties of the object
  for (const key in obj) {
    // Only consider own properties of the object (not inherited properties)
    if (obj.hasOwnProperty(key)) {
      // If the value is an object, recursively flatten it
      if (typeof obj[key] === "object" && obj[key] !== null) {
        // Pass the current key as the prefix to the recursive call
        const nested = flattenObject(obj[key], prefix + key + ".");
        // Add the flattened key-value pairs from the nested object to the result object
        Object.assign(result, nested);
      } else {
        // Otherwise, add the key-value pair to the result object
        result[prefix + key] = obj[key];
      }
    }
  }

  // Return the result object, which contains all of the flattened key-value pairs
  return result;
}

interface NestedObject {
  [key: string]: any;
}

/**
 * Unflattens an object, converting all keys with concatenated property names
 * into nested properties.
 *
 * @param obj - The object to unflatten.
 * @returns The unflattened object.
 */
export function unflattenObject(obj: FlattenableObject): NestedObject {
  // Create a new object to store the unflattened key-value pairs
  const result: NestedObject = {};

  // Loop through the properties of the object
  for (const key in obj) {
    // Only consider own properties of the object (not inherited properties)
    if (obj.hasOwnProperty(key)) {
      // Split the key into its nested properties
      const parts = key.split(".");

      // Use reduce to build the nested object or array, starting with the result object
      const nested = parts.reduce((acc, part, i) => {
        // If this is the last property, set the value
        if (i === parts.length - 1) {
          // Check if the current property is a valid array index or a string that can be used as a property name
          if (Number.isInteger(+part) && +part >= 0) {
            // Set the value at the index in the array
            acc[+part] = obj[key];
          } else if (typeof part === "string") {
            // Otherwise, set the value as a property on the object
            acc[part] = obj[key];
          }
        } else {
          // Otherwise, create a new nested object or array if it doesn't exist,
          // or use the existing nested object or array
          const next = parts[i + 1];
          if (Number.isInteger(+next) && +next >= 0) {
            acc[part] = acc[part] || [];
          } else if (typeof next === "string") {
            acc[part] = acc[part] || {};
          }
        }
        return acc[part];
      }, result);
    }
  }

  // Return the result object, which contains all of the unflattened key-value pairs
  return result;
}

export async function copyClipBoard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return text;
  } catch (error) {
    return error;
  }
}

export function unzipPermission(
  _permission: [string, string, boolean][],
  registrations?: []
) {
  let teacher = false;
  let student = false;
  let exceptions: { userId: string; isAllowed: boolean }[] = [];

  for (let i = 0; i < _permission.length; i++) {
    if (_permission[i][0] === "role") {
      if (_permission[i][1] === "teacher") {
        teacher = _permission[i][2];
      } else if (_permission[i][1] === "student") {
        student = _permission[i][2];
      }
    } else {
      exceptions.push({
        userId: _permission[i][1],
        isAllowed: _permission[i][2],
        ...(find(registrations, { userId: _permission[i][1] }) ?? {
          userName: "",
          role: "",
        }),
      });
    }
  }

  return { teacher, student, exceptions };
}

export function zipPermission(_permission: any) {
  const permission = [];

  for (let i = 0; i < _permission.exceptions.length; i++) {
    permission.push([
      "userId",
      _permission.exceptions[i]["userId"],
      _permission.exceptions[i]["isAllowed"],
    ]);
  }
  permission.push(["role", "teacher", _permission?.teacher]);
  permission.push(["role", "student", _permission?.student]);

  return permission;
}
