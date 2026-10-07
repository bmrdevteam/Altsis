/**
 * AI 입출력 안전 필터
 * @description 개인정보 패턴 마스킹. 구현은 alter/core/safety.js.
 * 도메인 호출자는 이 경로를 유지한다. alter 안에서는 core를 직접 부른다.
 */

export { maskSensitiveText, maskSensitiveObject } from "../alter/core/safety.js";
