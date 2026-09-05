import {
  DEFAULT_EMAIL_NOTIFY_TYPES,
  EMAIL_ELIGIBLE_TYPES,
  buildNotificationEmail,
  escapeHtml,
  formatEmailContextLine,
  loadAltSheetEmailContexts,
  normalizeEmailContext,
  isEmailTypeAllowed,
  isSmtpConfigured,
  normalizeEmailNotifyTypes,
  resolveRecipientEmail,
  shouldSendNotificationEmail,
} from "../../src/services/notificationEmail.js";

const smtp = {
  host: "smtp.example.com",
  port: 587,
  secure: false,
  user: "mailer@example.com",
  pass: "secret",
  from: "학교 <mailer@example.com>",
};

describe("resolveRecipientEmail", () => {
  test("prefers profile email", () => {
    expect(
      resolveRecipientEmail({
        email: "user@school.org",
        snsId: { google: "g@gmail.com" },
      })
    ).toBe("user@school.org");
  });

  test("falls back to snsId.google", () => {
    expect(
      resolveRecipientEmail({
        email: "",
        snsId: { google: "g@gmail.com" },
      })
    ).toBe("g@gmail.com");
  });

  test("returns null when neither is a valid email", () => {
    expect(resolveRecipientEmail({ email: "not-an-email" })).toBeNull();
    expect(resolveRecipientEmail({})).toBeNull();
  });
});

describe("isSmtpConfigured", () => {
  test("requires host, user, and pass", () => {
    expect(isSmtpConfigured(smtp)).toBe(true);
    expect(isSmtpConfigured({ ...smtp, pass: "" })).toBe(false);
    expect(isSmtpConfigured({ ...smtp, host: "  " })).toBe(false);
    expect(isSmtpConfigured(null)).toBe(false);
  });
});

describe("isEmailTypeAllowed", () => {
  test("never allows server-capped types", () => {
    expect(isEmailTypeAllowed("newPost", { newPost: true })).toBe(false);
    expect(isEmailTypeAllowed("chatMessage", DEFAULT_EMAIL_NOTIFY_TYPES)).toBe(
      false
    );
    expect(isEmailTypeAllowed("scheduleStart", DEFAULT_EMAIL_NOTIFY_TYPES)).toBe(
      false
    );
  });

  test("eligible types default ON when academy types are missing", () => {
    expect(isEmailTypeAllowed("altFormApprovalRequest", null)).toBe(true);
    expect(isEmailTypeAllowed("reminder", {})).toBe(true);
  });

  test("respects academy admin whitelist", () => {
    expect(
      isEmailTypeAllowed("classInvitation", { classInvitation: false })
    ).toBe(false);
    expect(
      isEmailTypeAllowed("classInvitation", { classInvitation: true })
    ).toBe(true);
  });
});

describe("normalizeEmailNotifyTypes", () => {
  test("ignores never-mail keys and fills defaults", () => {
    const next = normalizeEmailNotifyTypes({
      newPost: true,
      reminder: false,
    });
    expect(next.newPost).toBeUndefined();
    expect(next.reminder).toBe(false);
    expect(next.classInvitation).toBe(true);
    expect(Object.keys(next).sort()).toEqual(
      [...EMAIL_ELIGIBLE_TYPES].sort()
    );
  });
});

describe("shouldSendNotificationEmail", () => {
  const base = {
    emailNotifyEnabled: true,
    smtp,
    emailEnabled: true,
    recipientEmail: "user@school.org",
    notificationType: "altFormApprovalResult",
    academyTypes: DEFAULT_EMAIL_NOTIFY_TYPES,
    userTypeEnabled: true,
  };

  test("sends when every gate is on", () => {
    expect(shouldSendNotificationEmail(base)).toBe(true);
  });

  test("skips when academy allow is off", () => {
    expect(
      shouldSendNotificationEmail({ ...base, emailNotifyEnabled: false })
    ).toBe(false);
  });

  test("skips when SMTP is missing", () => {
    expect(shouldSendNotificationEmail({ ...base, smtp: null })).toBe(false);
  });

  test("skips when user opted out", () => {
    expect(shouldSendNotificationEmail({ ...base, emailEnabled: false })).toBe(
      false
    );
  });

  test("skips when user has no address", () => {
    expect(
      shouldSendNotificationEmail({ ...base, recipientEmail: null })
    ).toBe(false);
  });

  test("skips never-mail types even if admin stored them", () => {
    expect(
      shouldSendNotificationEmail({
        ...base,
        notificationType: "newPost",
        academyTypes: { newPost: true },
      })
    ).toBe(false);
  });

  test("skips when academy whitelist is off", () => {
    expect(
      shouldSendNotificationEmail({
        ...base,
        academyTypes: { ...DEFAULT_EMAIL_NOTIFY_TYPES, reminder: false },
        notificationType: "reminder",
      })
    ).toBe(false);
  });

  test("skips when user type toggle is off", () => {
    expect(
      shouldSendNotificationEmail({ ...base, userTypeEnabled: false })
    ).toBe(false);
  });
});

describe("buildNotificationEmail", () => {
  test("escapes title and description in html", () => {
    expect(escapeHtml(`<b>x</b> & "y"`)).toBe(
      "&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;"
    );
    const built = buildNotificationEmail({
      title: "현장학습 <script>",
      description: "조은길님이 요청했습니다.",
      url: "https://app.example/open",
      category: "승인",
    });
    expect(built.subject).toBe("현장학습 <script>");
    expect(built.text).toContain("조은길님이 요청했습니다.");
    expect(built.text).toContain("https://app.example/open");
    expect(built.html).toContain("승인");
    expect(built.html).toContain("앱에서 열기");
    expect(built.html).toContain("https://app.example/open");
    expect(built.html).not.toContain("<script>");
    expect(built.html).toContain("현장학습 &lt;script&gt;");
  });

  test("omits button when there is no url", () => {
    const built = buildNotificationEmail({
      title: "테스트",
      category: "테스트",
    });
    expect(built.html).not.toContain("앱에서 열기");
    expect(built.text).toBe("테스트");
  });

  test("includes school, board, and form under the title", () => {
    const built = buildNotificationEmail({
      title: "좋습니다! · 승인 요청",
      description: "조은길님이 「1차 승인」승인을 요청했습니다.",
      category: "승인",
      context: {
        schoolName: "별무리 고등학교",
        boardName: "전자문서시스템",
        formTitle: "테스트",
      },
    });
    expect(built.subject).toBe("좋습니다! · 승인 요청");
    expect(built.text).toContain("학교: 별무리 고등학교");
    expect(built.text).toContain("보드: 전자문서시스템");
    expect(built.text).toContain("양식: 테스트");
    expect(built.html).toContain("별무리 고등학교");
    expect(built.html).toContain("전자문서시스템");
    expect(built.html).toContain("테스트");
    expect(built.html).toContain("학교");
    expect(built.html).toContain("보드");
    expect(built.html).toContain("양식");
  });

  test("escapes context names and drops empty rows", () => {
    expect(
      normalizeEmailContext({
        schoolName: " 별무리 ",
        boardName: "",
        formTitle: "현장학습 <b>",
      })
    ).toEqual([
      { label: "학교", value: "별무리" },
      { label: "양식", value: "현장학습 <b>" },
    ]);
    expect(
      formatEmailContextLine({
        schoolName: "별무리 고등학교",
        boardName: "전자문서시스템",
        formTitle: "테스트",
      })
    ).toBe("별무리 고등학교 · 전자문서시스템 · 테스트");
    const built = buildNotificationEmail({
      title: "요청",
      context: { formTitle: "<script>x</script>" },
    });
    expect(built.html).not.toContain("<script>x</script>");
    expect(built.html).toContain("&lt;script&gt;x&lt;/script&gt;");
  });
});

describe("loadAltSheetEmailContexts", () => {
  test("returns empty map when there is no altSheetRow", async () => {
    await expect(
      loadAltSheetEmailContexts("bmr", [
        { relatedEntity: { type: "board", id: "1" } },
        { relatedEntity: null },
      ])
    ).resolves.toEqual({});
  });
});
