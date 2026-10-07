/**
 * Alter dependency boundaries. Current violations live in
 * .dependency-cruiser-known-violations.json and are listed with the
 * migration PR that removes them in src/alter/dependency-baseline.md.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: "core-depends-on-nothing",
      comment: "core는 다른 소스 모듈을 부르지 않는다.",
      severity: "error",
      from: { path: "^src/alter/core/" },
      to: { path: "^src/", pathNot: "^src/alter/core/" },
    },
    {
      name: "only-tools-and-policy-touch-domain",
      comment:
        "기존 도메인 services·models·controllers는 tools와 policy만 부른다. services/alter*는 이전이 끝나기 전의 Alter 구현이다.",
      severity: "error",
      from: { path: "^src/alter/", pathNot: "^src/alter/(tools|policy)/" },
      to: {
        path: "^src/(services|models|controllers)/",
        pathNot: "^src/services/alter",
      },
    },
    {
      name: "tools-skills-providers-not-to-agent-or-runners",
      comment: "tools, skills, providers는 agent와 runners를 부르지 않는다.",
      severity: "error",
      from: { path: "^src/alter/(tools|skills|providers)/" },
      to: { path: "^src/alter/(agent|runners)/" },
    },
    {
      name: "tools-not-to-providers",
      comment: "tools는 providers를 부르지 않는다. LLM은 ctx.llm 포트로만.",
      severity: "error",
      from: { path: "^src/alter/tools/" },
      to: { path: "^src/alter/providers/" },
    },
    {
      name: "skills-not-to-providers",
      comment: "skills는 providers와 agent 내부를 부르지 않는다. 실행은 runners/skill이 runAlterAgent로 한다.",
      severity: "error",
      from: { path: "^src/alter/skills/" },
      to: { path: "^src/alter/providers/" },
    },
    {
      name: "providers-not-to-tools",
      comment: "providers는 tools를 부르지 않는다.",
      severity: "error",
      from: { path: "^src/alter/providers/" },
      to: { path: "^src/alter/tools/" },
    },
    {
      name: "domain-not-to-alter",
      comment:
        "controllers와 Alter 밖 services는 alter를 import하지 않는다. 동적 import도 포함한다. services/aiSafety.js와 services/seasonAiAccess.js는 core·policy의 기존 공개 경로로, 재수출만 한다.",
      severity: "error",
      from: {
        path: "^src/(controllers|services)/",
        pathNot: "^src/services/(alter|aiSafety\\.js$|seasonAiAccess\\.js$)",
      },
      to: { path: "^src/(alter/|services/alter)" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    includeOnly: "^src",
    moduleSystems: ["es6", "cjs", "amd"],
    tsPreCompilationDeps: false,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
      mainFields: ["module", "main"],
    },
  },
};
