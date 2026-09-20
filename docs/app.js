const CUES = {
  A: { word: "左顺", dir: "左", step: "顺步", poker: "黑桃", tip: "LS", full: "向左顺步突破" },
  B: { word: "左交", dir: "左", step: "交叉步", poker: "红心", tip: "LC", full: "向左交叉步突破" },
  C: { word: "右顺", dir: "右", step: "顺步", poker: "梅花", tip: "RS", full: "向右顺步突破" },
  D: { word: "右交", dir: "右", step: "交叉步", poker: "方块", tip: "RC", full: "向右交叉步突破" },
};
const WILLIAMS = { 1: ["A","B","D","C"], 2: ["B","C","A","D"], 3: ["C","D","B","A"], 4: ["D","A","C","B"] };
const PEOPLE = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(3, "0"));
const SEQ = Object.fromEntries(PEOPLE.map((id, i) => [id, (i % 4) + 1]));
const GROUPS = [0,1,2,3,4].map((g) => PEOPLE.slice(g * 3, g * 3 + 3));
const SESSIONS = GROUPS.flatMap((trio, gi) => {
  const rot = [[trio[0], trio[1], trio[2]], [trio[1], trio[2], trio[0]], [trio[2], trio[0], trio[1]]];
  return rot.map(([defender, attacker, rest], ri) => {
    const seq = SEQ[defender];
    const index = gi * 3 + ri;
    return {
      index, id: String(index + 1).padStart(2, "0"), group: gi + 1,
      defender, attacker, rest, seq,
      trials: WILLIAMS[seq].map((c) => CUES[c]),
    };
  });
});

const KEY = "breakthrough-cue-v1";
const state = { screen: "home", sessionIndex: 0, trialIndex: 0, redoFlash: 0 };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (saved && typeof saved.sessionIndex === "number") Object.assign(state, saved);
} catch {}

function save() {
  localStorage.setItem(KEY, JSON.stringify({
    screen: state.screen, sessionIndex: state.sessionIndex, trialIndex: state.trialIndex,
  }));
}
function set(patch) { Object.assign(state, patch); save(); render(); }

async function wake() {
  try { await navigator.wakeLock?.request("screen"); } catch {}
}

function session() { return SESSIONS[Math.min(state.sessionIndex, SESSIONS.length - 1)]; }

function render() {
  const root = document.getElementById("app");
  const s = session();
  if (state.screen === "home") root.innerHTML = home();
  else if (state.screen === "done") root.innerHTML = done();
  else if (state.screen === "handoff") root.innerHTML = handoff(s);
  else if (state.screen === "cover") root.innerHTML = cover(s);
  else root.innerHTML = cue(s);
  bind();
  if (state.screen !== "home" && state.screen !== "done") wake();
}

function home() {
  const cards = SESSIONS.map((x) =>
    `<button class="card" data-act="start" data-i="${x.index}"><small>${x.id}</small><b>防 ${x.defender}</b><span>攻 ${x.attacker}</span></button>`
  ).join("");
  const has = state.sessionIndex > 0 || state.trialIndex > 0 || state.screen !== "home";
  return `
    <p class="kicker">进攻人专用</p>
    <h1>突破指令</h1>
    <p class="lead">Williams 方 15 场轮换。把屏幕只亮给进攻人看，不要让防守人看见指令。</p>
    <div class="stats"><div><b>15</b><span>场次</span></div><div><b>4 次</b><span>每场</span></div><div><b>001–015</b><span>编号</span></div></div>
    <div class="actions" style="margin-top:1.5rem">
      <button class="btn btn-primary" data-act="start" data-i="0">从场次 01 开始</button>
      ${has ? `<button class="btn btn-sec" data-act="resume">继续上次</button>` : ""}
    </div>
    <div style="margin-top:2rem;display:flex;justify-content:space-between;align-items:center">
      <h2 style="margin:0;font-size:0.875rem;font-weight:500;color:var(--muted)">跳到指定场次</h2>
      <button class="btn-ghost" style="width:auto;height:auto;border:0;font-size:0.75rem" data-act="reset">清空进度</button>
    </div>
    <div class="grid" style="margin-top:0.75rem">${cards}</div>
    <p class="subtle" style="text-align:center;font-size:0.75rem;margin-top:1.5rem;line-height:1.6">作废按同一条指令重测。不要读出声。</p>`;
}

function top(s, extra) {
  return `<div class="top"><button data-act="home">场次</button><div>${extra || ("场次 " + s.id)} <span class="subtle">/ 15</span></div><div class="subtle">第${s.group}组</div></div>`;
}
function roles(s) {
  return `<div class="roles"><div><div class="k">防</div><div class="v muted">${s.defender}</div></div><div><div class="k">攻</div><div class="v">${s.attacker}</div></div><div><div class="k">歇</div><div class="v muted">${s.rest}</div></div></div>`;
}

function cover(s) {
  return `${top(s)}
    <div class="hero">
      <p style="font-size:1.5rem;font-weight:600;margin:0">指令已遮住</p>
      <p class="lead" style="text-align:center">把手机交给进攻人 ${s.attacker} 之后再点显示。防守人 ${s.defender} 不要看屏幕。</p>
    </div>
    <div class="actions"><button class="btn btn-primary" data-act="reveal">显示给进攻人</button></div>`;
}

function cue(s) {
  const t = state.trialIndex;
  const c = s.trials[t];
  const last = t + 1 >= 4;
  const dots = [0,1,2,3].map((i) => `<span class="dot ${i===t?"on":i<t?"done":""}"></span>`).join("");
  return `${top(s)}${roles(s)}
    <div class="hero">
      <div class="dots">${dots}</div>
      <p class="subtle" style="letter-spacing:0.2em;font-size:0.75rem;margin:1rem 0 0">第 ${t+1} 次${state.redoFlash?" · 重测":""}</p>
      <p class="word ${c.dir==="左"?"left":"right"}">${c.word}</p>
      <p class="muted">${c.dir} · ${c.step}</p>
      <p class="subtle" style="font-family:ui-monospace,monospace;letter-spacing:0.18em;font-size:0.875rem">${c.poker} · ${c.tip}</p>
      <p class="subtle" style="max-width:18ch;font-size:0.875rem;line-height:1.6">${c.full}。不要读出声。</p>
    </div>
    <div class="actions">
      <button class="btn btn-primary" data-act="next">${last ? "本场完成，换人" : "完成，下一次"}</button>
      <div class="row">
        <button class="btn btn-ghost" data-act="redo">作废重测</button>
        <button class="btn btn-sec" data-act="hide">遮住</button>
      </div>
    </div>`;
}

function handoff(s) {
  const prev = SESSIONS[s.index - 1];
  return `${top(s, "下一场")}
    <div class="grow">
      <p class="kicker">换角色</p>
      ${prev ? `<p class="muted" style="font-size:0.875rem">场次 ${prev.id} 已完成 · 防 ${prev.defender}</p>` : ""}
      <h2 style="font-size:1.875rem;margin:1.25rem 0 0">场次 ${s.id}</h2>
      <div class="panel" style="margin-top:1.5rem">
        <ul>
          <li><span class="muted">防守（被测）</span><b style="font-family:ui-monospace,monospace;font-weight:500">${s.defender}</b></li>
          <li><span class="muted">进攻（看指令）</span><b style="font-family:ui-monospace,monospace;font-weight:500">${s.attacker}</b></li>
          <li><span class="muted">休息</span><span class="muted" style="font-family:ui-monospace,monospace">${s.rest}</span></li>
        </ul>
      </div>
    </div>
    <div class="actions"><button class="btn btn-primary" data-act="begin">开始场次 ${s.id}</button></div>`;
}

function done() {
  return `<div class="hero"><h2 style="font-size:1.875rem">全部完成</h2><p class="lead" style="text-align:center">15 场 × 4 次指令已走完。</p></div>
    <div class="actions">
      <button class="btn btn-primary" data-act="home">返回场次列表</button>
      <button class="btn btn-sec" data-act="reset">清空并重来</button>
    </div>`;
}

function bind() {
  document.querySelectorAll("[data-act]").forEach((el) => {
    el.addEventListener("click", () => {
      const act = el.getAttribute("data-act");
      if (act === "start") set({ screen: "cover", sessionIndex: Number(el.getAttribute("data-i") || 0), trialIndex: 0, redoFlash: 0 });
      if (act === "resume") {
        if (state.sessionIndex >= SESSIONS.length) set({ screen: "done" });
        else set({ screen: state.trialIndex > 0 ? "cue" : "cover" });
      }
      if (act === "reset") set({ screen: "home", sessionIndex: 0, trialIndex: 0, redoFlash: 0 });
      if (act === "home") set({ screen: "home" });
      if (act === "reveal") set({ screen: "cue" });
      if (act === "hide") set({ screen: "cover" });
      if (act === "redo") set({ redoFlash: state.redoFlash + 1, screen: "cue" });
      if (act === "begin") set({ screen: "cover", trialIndex: 0 });
      if (act === "next") {
        if (state.trialIndex + 1 < 4) set({ trialIndex: state.trialIndex + 1, screen: "cue", redoFlash: 0 });
        else if (state.sessionIndex + 1 >= SESSIONS.length) set({ screen: "done", trialIndex: 4 });
        else set({ screen: "handoff", sessionIndex: state.sessionIndex + 1, trialIndex: 0, redoFlash: 0 });
      }
    });
  });
}

render();
