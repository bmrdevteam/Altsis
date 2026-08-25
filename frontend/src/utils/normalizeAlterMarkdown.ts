/**
 * Alter AI 답변 마크다운을 CommonMark/GFM이 기대하는 형태에 가깝게 보정한다.
 *
 * 모델이 자주 쓰는 `•` 불릿과 `3. 짧은 제목` + 목록 조합은
 * 파서가 한 listItem 안의 일반 텍스트로 합쳐 버려 구조·강조가 깨진다.
 */
import {
  preserveMarkdownCode,
  restoreMarkdownCode,
} from "components/markdown/preserveMarkdownCode";

const normalizeAlterMarkdown = (content: string): string => {
  if (!content) return content;

  let text = content.replace(/\r\n/g, "\n");

  const { withPlaceholders, preserved } = preserveMarkdownCode(text);
  text = withPlaceholders;

  // 유니코드 불릿 → 마크다운 목록
  text = text.replace(/^(\s*)[•·▪◦]\s+/gm, "$1- ");

  // `3. 짧은 제목` 바로 아래 목록이 오면 제목으로 분리
  // (그렇지 않으면 ol 항목 lazy continuation으로 •/- 줄이 흡수됨)
  text = text.replace(
    /^(\d+)\.\s+([^\n]{1,60})\n(?=\s*[-*] |\s*\d+\. )/gm,
    (match, num: string, title: string) => {
      const trimmed = title.trim();
      // 문장형(끝에 다/요/음 등)은 제목이 아닐 가능성이 높아 그대로 둔다
      if (/[다요임죠네]\s*$/.test(trimmed) || trimmed.length > 48) {
        return `${num}. ${trimmed}\n\n`;
      }
      return `### ${num}. ${trimmed}\n\n`;
    }
  );

  // 목록이 아닌 줄 바로 아래 목록이 오면 빈 줄로 분리 (항목 사이는 건드리지 않음)
  text = text.replace(
    /^(?![ \t]*(?:[-*] |\d+\. ))([^\n]+)\n(?=[ \t]*(?:[-*] |\d+\. ))/gm,
    "$1\n\n"
  );

  // `** 텍스트 **`처럼 공백이 끼면 emphasis로 안 잡히는 경우 보정.
  // 코드는 이미 placeholder라 `` `</a>` ``가 <strong> 안에서 태그로 안 열림.
  text = text.replace(/\*\*\s*([^*]+?)\s*\*\*/g, (_, inner: string) => {
    return `<strong>${inner.trim()}</strong>`;
  });

  return restoreMarkdownCode(text, preserved);
};

export default normalizeAlterMarkdown;
