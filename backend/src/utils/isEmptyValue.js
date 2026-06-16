/**
 * 값이 "비어 있는지" 판별한다.
 * - null/undefined: 비어 있음
 * - 문자열: 공백만 있으면 비어 있음
 * - 숫자/불리언: 항상 비어 있지 않음
 * - 배열/객체: 모든 요소가 비어 있으면 비어 있음 (재귀)
 *
 * 평가(evaluation) 데이터 유무 판별 등에 사용된다.
 * 모델·서비스 양쪽에서 공유하므로 순환 의존을 피하기 위해 의존성 없는 순수 함수로 둔다.
 *
 * @param {*} value
 * @returns {boolean}
 */
export const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true;

  if (typeof value === "string") {
    return value.trim() === "";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length === 0 || value.every((item) => isEmptyValue(item));
  }

  if (typeof value === "object") {
    const values = Object.values(value);
    return values.length === 0 || values.every((item) => isEmptyValue(item));
  }

  return false;
};
