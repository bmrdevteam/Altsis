const DAYS = [
  { n: 26, in: false },
  { n: 27, in: false },
  { n: 28, in: false },
  { n: 29, in: false },
  { n: 30, in: false },
  { n: 31, in: false },
  { n: 1, in: true, ev: [["동아리", "g"]] },
  { n: 2, in: true },
  { n: 3, in: true, ev: [["멘토링", "i"]] },
  { n: 4, in: true },
  { n: 5, in: true, ev: [["수업", "b"]] },
  { n: 6, in: true },
  { n: 7, in: true, ev: [["발표회", "p"]] },
  { n: 8, in: true },
  { n: 9, in: true },
  { n: 10, in: true, ev: [["기록 입력", "a"]] },
  { n: 11, in: true },
  { n: 12, in: true, ev: [["학부모 상담", "a"]] },
  { n: 13, in: true },
  { n: 14, in: true, ev: [["현장학습", "g"]] },
  { n: 15, in: true, ev: [["현장학습", "g"]] },
  { n: 16, in: true },
  { n: 17, in: true, ev: [["보드 활동", "p"]] },
  { n: 18, in: true },
  { n: 19, in: true, ev: [["수업 개강", "i"]] },
  { n: 20, in: true },
  { n: 21, in: true, ev: [["프로젝트", "b"]] },
  { n: 22, in: true },
  { n: 23, in: true },
  { n: 24, in: true, ev: [["멘토링", "i"]] },
  { n: 25, in: true },
  {
    n: 26,
    in: true,
    today: true,
    ev: [
      ["전체 조회", "b"],
      ["프로젝트 점검", "i"],
    ],
  },
  { n: 27, in: true, ev: [["캠프", "g"]] },
  { n: 28, in: true, ev: [["캠프", "g"]] },
  { n: 29, in: true },
  { n: 30, in: true },
  { n: 31, in: true, ev: [["학기 평가", "a"]] },
  { n: 1, in: false },
  { n: 2, in: false },
  { n: 3, in: false },
  { n: 4, in: false },
  { n: 5, in: false },
];

const ICONS = {
  menu: '<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path>',
  search:
    '<path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>',
  eventCalendar:
    '<path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z"></path>',
  menuBook:
    '<path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"></path>',
  editNote:
    '<path d="M3 10h11v2H3v-2zm0-2h11V6H3v2zm0 8h7v-2H3v2zm15.01-3.13.71-.71a.996.996 0 0 1 1.41 0l.71.71c.39.39.39 1.02 0 1.41l-.71.71-2.12-2.12zm-.71.71-5.3 5.3V21h2.12l5.3-5.3-2.12-2.12z"></path>',
  article:
    '<path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"></path><path d="M14 17H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"></path>',
  dashboard:
    '<path d="M19 5v2h-4V5h4M9 5v6H5V5h4m10 8v6h-4v-6h4M9 17v2H5v-2h4M21 3h-8v6h8V3zM11 3H3v10h8V3zm10 8h-8v10h8V11zm-10 4H3v6h8v-6z"></path>',
  adminSettings:
    '<path d="M17 17.5c-.73 0-2.19.36-2.24 1.08.5.71 1.32 1.17 2.24 1.17s1.74-.46 2.24-1.17c-.05-.72-1.51-1.08-2.24-1.08z"></path><path d="M18 11.09V6.27L10.5 3 3 6.27v4.91c0 4.54 3.2 8.79 7.5 9.82.55-.13 1.08-.32 1.6-.55A5.973 5.973 0 0 0 17 23c3.31 0 6-2.69 6-6 0-2.97-2.16-5.43-5-5.91zM11 17c0 .56.08 1.11.23 1.62-.24.11-.48.22-.73.3-3.17-1-5.5-4.24-5.5-7.74v-3.6l5.5-2.4 5.5 2.4v3.51c-2.84.48-5 2.94-5 5.91zm6 4c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"></path><circle cx="17" cy="15.5" r="1.12"></circle>',
  notification:
    '<path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"></path>',
  chat: '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"></path>',
  settings:
    '<path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.488.488 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.566.566 0 0 0-.18-.03c-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73 0 .21-.02.43-.05.73l-.14 1.13.89.7 1.08.84-.7 1.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16 1.13-.2 1.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21 1.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21 1.27.51 1.04.42.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19 1.35.16 1.13 1.06.43c.43.18.83.41 1.23.71l.91.7 1.06-.43 1.27-.51.7 1.21-1.07.85-.89.7.14 1.13zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"></path>',
  logout:
    '<path d="m17 8-1.41 1.41L17.17 11H9v2h8.17l-1.58 1.58L17 16l4-4-4-4zM5 5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h7v-2H5V5z"></path>',
  expand:
    '<path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z"></path>',
};

const NAV_ITEMS = [
  ["schedule", "eventCalendar", "일정"],
  ["courses", "menuBook", "수업"],
  ["archive", "editNote", "기록"],
  ["docs", "article", "문서"],
  ["boards", "dashboard", "보드"],
  ["admin", "adminSettings", "관리"],
];

function svg(type, size) {
  const s = size || 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24">${ICONS[type] || ""}</svg>`;
}

function alterSparkle(size) {
  const s = size || 20;
  return `<svg class="alter_star" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">
    <defs>
      <linearGradient id="alterGrad" gradientUnits="userSpaceOnUse" x1="-6" y1="4" x2="30" y2="20">
        <stop offset="0%" stop-color="#c4b5fd"/>
        <stop offset="25%" stop-color="#60a5fa"/>
        <stop offset="50%" stop-color="#2dd4bf"/>
        <stop offset="75%" stop-color="#818cf8"/>
        <stop offset="100%" stop-color="#c4b5fd"/>
      </linearGradient>
    </defs>
    <path fill="url(#alterGrad)" d="M11.5 9.5 9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5z"/>
    <path fill="url(#alterGrad)" d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9z"/>
    <path fill="url(#alterGrad)" d="M19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
  </svg>`;
}

function fillGrid(grid) {
  if (!grid) return;
  grid.replaceChildren();
  DAYS.forEach((day) => {
    const cell = document.createElement("div");
    cell.className =
      "cal-cell" + (day.in ? " current" : "") + (day.today ? " today" : "");
    const date = document.createElement("div");
    date.className = "cal-date" + (day.today ? " today" : "");
    date.textContent = String(day.n);
    cell.appendChild(date);
    (day.ev || []).forEach(([label, tone]) => {
      const ev = document.createElement("div");
      ev.className = "cal-item ev-" + tone;
      ev.textContent = label;
      cell.appendChild(ev);
    });
    grid.appendChild(cell);
  });
}

function showOnly(nodes, onEl, instant) {
  if (instant) {
    nodes.forEach((node) => node && node.classList.add("is-snap"));
    nodes.forEach((node) => node && node.offsetWidth);
  }
  nodes.forEach((node) => {
    if (!node) return;
    if (node === onEl) {
      node.classList.remove("is-leaving");
      node.classList.add("is-on");
      return;
    }
    if (!node.classList.contains("is-on") && !node.classList.contains("is-leaving")) {
      return;
    }
    if (instant) {
      node.classList.remove("is-on", "is-leaving");
      return;
    }
    node.classList.remove("is-on");
    node.classList.add("is-leaving");
    window.setTimeout(() => node.classList.remove("is-leaving"), 400);
  });
  if (instant) {
    nodes.forEach((node) => node && node.offsetWidth);
    requestAnimationFrame(() => {
      nodes.forEach((node) => node && node.classList.remove("is-snap"));
    });
  }
}

function setZoom() {
  /* 본문만 확대하면 사이드바와 비율이 깨진다. 스케일은 fitStage contain만 쓴다. */
}

function setText(el, text) {
  if (el) el.textContent = text;
}

function typeInto(el, text, charMs) {
  if (!el) return;
  el.textContent = "";
  let i = 0;
  const tick = () => {
    i += 1;
    el.textContent = text.slice(0, i);
    if (i < text.length) window.setTimeout(tick, charMs);
  };
  tick();
}

function movePointer(pointer, x, y, click) {
  if (!pointer) return;
  pointer.classList.add("is-on");
  pointer.style.left = x + "px";
  pointer.style.top = y + "px";
  if (click) {
    window.setTimeout(() => pointer.classList.add("is-click"), 520);
    window.setTimeout(() => pointer.classList.remove("is-click"), 720);
  }
}

function pointAt(pointer, el, click) {
  if (!pointer || !el) return;
  const stage = document.getElementById("stage");
  const sr = stage.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  const scale =
    parseFloat(getComputedStyle(stage).getPropertyValue("--scale")) || 1;
  const x = (er.left + er.width / 2 - sr.left) / scale;
  const y = (er.top + er.height / 2 - sr.top) / scale;
  movePointer(pointer, x, y, click);
}

function setActiveNav(key) {
  document.querySelectorAll(".nav_link[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === key);
  });
}

function setSchoolName(name, ghost) {
  const el = document.getElementById("schoolName");
  if (!el) return;
  el.textContent = name;
  el.classList.toggle("is-ghost", Boolean(ghost));
}

function mountShell(app) {
  if (!app || app.dataset.shelled === "1") return;
  app.dataset.shelled = "1";
  const kids = Array.from(app.childNodes);
  const school = app.dataset.school || "Alt School";
  const active = app.dataset.active || "schedule";
  const ghost = app.dataset.ghost === "1";
  const wrap = document.createElement("div");
  wrap.className = "main";
  wrap.innerHTML = `
    <aside class="sidebar">
      <div class="nav_logo">
        <span class="icon">${svg("menu", 24)}</span>
        <span class="logo school${ghost ? " is-ghost" : ""}" id="schoolName">${school}</span>
      </div>
      <div class="search_container">
        <div class="search">
          <span class="icon">${svg("search", 24)}</span>
          <div class="search_input">검색</div>
        </div>
      </div>
      <div class="nav_links">
        ${NAV_ITEMS.map(
          ([key, icon, name]) => `
          <div class="nav_link${key === active ? " active" : ""}" data-nav="${key}" id="nav-${key}">
            <span class="icon">${svg(icon, 24)}</span>
            <span class="name">${name}</span>
          </div>`
        ).join("")}
      </div>
      <div class="nav_profile_container">
        <div class="nav_profile">
          <div class="avatar" aria-hidden="true">민</div>
          <div class="profile_info">
            <div class="username">이민준</div>
            <div class="role">교사</div>
          </div>
          <div class="profile_tools">
            ${svg("settings", 18)}
            ${svg("logout", 18)}
          </div>
        </div>
      </div>
    </aside>
    <div class="content">
      <header class="navbar">
        <div class="search_trigger">
          ${svg("search", 16)}
          <span class="search_placeholder">검색</span>
          <span class="search_shortcut">⌘K</span>
        </div>
        <div class="menu_item">
          <div class="season_select">2026 2학기 ${svg("expand", 16)}</div>
        </div>
        <div class="nav_controls">
          <div class="icon_btn" title="알림">${svg("notification", 20)}</div>
          <div class="icon_btn" title="채팅">${svg("chat", 20)}</div>
          <div class="icon_btn" id="alterBtn" title="Alter">${alterSparkle(20)}</div>
        </div>
      </header>
      <div class="page-scroll"></div>
    </div>`;
  const scroll = wrap.querySelector(".page-scroll");
  kids.forEach((node) => scroll.appendChild(node));
  app.replaceChildren(wrap);
}

function ensureCopyLayer(stage) {
  if (!stage || document.getElementById("copyHero")) return;
  const veil = document.createElement("div");
  veil.className = "copy-veil";
  veil.id = "copyVeil";
  const hero = document.createElement("div");
  hero.className = "copy-hero";
  hero.id = "copyHero";
  hero.innerHTML = `
    <div class="copy-kicker" id="copyKicker"></div>
    <div class="copy-stack">
      <h1 class="copy-line" id="copyLine"></h1>
      <p class="copy-sub" id="copySub"></p>
    </div>`;
  stage.appendChild(veil);
  stage.appendChild(hero);
}

function bumpHero() {
  const hero = document.getElementById("copyHero");
  if (!hero) return;
  hero.classList.remove("is-on");
  void hero.offsetWidth;
  hero.classList.add("is-on");
}

function showCopy({ key, feat, line, sub, veil, band } = {}) {
  if (!band) {
    document.getElementById("pointer")?.classList.remove("is-on");
  }
  const veilEl = document.getElementById("copyVeil");
  const hero = document.getElementById("copyHero");
  const kicker = document.getElementById("copyKicker");
  const lineEl = document.getElementById("copyLine");
  const subEl = document.getElementById("copySub");
  if (!veilEl || !lineEl || !hero) return;
  veilEl.classList.remove("is-full", "is-heavy", "is-band");
  hero.classList.toggle("is-band", Boolean(band));
  if (band) {
    veilEl.classList.add("is-band");
  } else {
    if (veil === "full") veilEl.classList.add("is-full");
    if (veil === "heavy") veilEl.classList.add("is-heavy");
  }
  veilEl.classList.add("is-on");
  const chips = [];
  if (!band && key) chips.push(`<span class="copy-chip">${key}</span>`);
  if (feat) chips.push(`<span class="copy-chip">${feat}</span>`);
  if (kicker) kicker.innerHTML = chips.join("");
  lineEl.textContent = line || "";
  lineEl.classList.toggle("is-long", Boolean(band && (line || "").length > 28));
  if (subEl) subEl.textContent = sub || "";
  bumpHero();
}

function hideCopy() {
  const veilEl = document.getElementById("copyVeil");
  const hero = document.getElementById("copyHero");
  const lineEl = document.getElementById("copyLine");
  veilEl?.classList.remove("is-on", "is-full", "is-heavy", "is-band");
  hero?.classList.remove("is-on", "is-band");
  lineEl?.classList.remove("is-long");
}

function bootPromo({ durationMs, beats = [], onReset, onPlay }) {
  const params = new URLSearchParams(window.location.search);
  if (params.has("embed") || params.has("still")) {
    document.body.classList.add("is-recording");
  }
  const still = params.has("still");

  const stage = document.getElementById("stage");
  const wrap = document.getElementById("wrap");
  const playBtn = document.getElementById("play");
  const recordBtn = document.getElementById("record");
  const app = document.getElementById("app");
  const timers = [];

  mountShell(app);
  ensureCopyLayer(stage);

  function clearTimers() {
    while (timers.length) window.clearTimeout(timers.pop());
  }

  function fitStage() {
    const sx = window.innerWidth / 1920;
    const sy = window.innerHeight / 1080;
    stage.style.setProperty("--scale", String(Math.min(sx, sy)));
  }

  function play() {
    clearTimers();
    hideCopy();
    setZoom(1);
    onReset?.();
    stage.classList.remove("is-playing");
    void stage.offsetWidth;
    stage.classList.add("is-playing");
    onPlay?.();
    beats.forEach((beat) => {
      timers.push(window.setTimeout(beat.run, beat.at));
    });
  }

  playBtn?.addEventListener("click", play);
  recordBtn?.addEventListener("click", () => {
    document.body.classList.add("is-recording");
    play();
    timers.push(
      window.setTimeout(() => {
        document.body.classList.remove("is-recording");
        fitStage();
      }, durationMs + 400)
    );
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      play();
    }
    if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      if (!document.fullscreenElement) wrap.requestFullscreen();
      else document.exitFullscreen();
    }
    if (event.key === "Escape") {
      document.body.classList.remove("is-recording");
      fitStage();
    }
  });

  window.addEventListener("resize", fitStage);
  document.addEventListener("fullscreenchange", () => {
    document.body.classList.toggle(
      "is-recording",
      Boolean(document.fullscreenElement)
    );
    fitStage();
  });

  fillGrid(document.getElementById("grid"));
  fitStage();
  if (still) onReset?.();
  else play();

  return {
    play,
    fitStage,
    movePointer,
    pointAt,
    typeInto,
    setText,
    showOnly,
    showCopy,
    hideCopy,
    setActiveNav,
    setSchoolName,
    setZoom,
  };
}

window.Promo = {
  DAYS,
  fillGrid,
  bootPromo,
  movePointer,
  pointAt,
  typeInto,
  setText,
  showOnly,
  showCopy,
  hideCopy,
  setActiveNav,
  setSchoolName,
  setZoom,
  svg,
  alterSparkle,
};
