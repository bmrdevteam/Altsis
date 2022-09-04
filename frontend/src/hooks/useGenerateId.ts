/**
 * hook that genenrates random id base on the given length
 * @param {number} length 
 * 
 * @returns {string} generated id
 * 
 * @version 1.0 initial version
 * 
 * @see https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
 * 
 */

export default function useGenerateId(length: number) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  // returns result
  return result as string;
}
