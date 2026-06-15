import { useState, useEffect, useRef, useCallback } from "react";

// ── CONFIG ───────────────────────────────────────────────────
const LEVELS = ["Easy", "Medium", "Hard", "Expert"];
const STYLES = [
  { id:"standard",  icon:"⚖️",  label:"Standard",  desc:"Direct rebuttal" },
  { id:"socratic",  icon:"🏛️",  label:"Socratic",  desc:"Question-led"    },
  { id:"crossexam", icon:"🔍",  label:"Cross-Exam", desc:"Find the flaw"  },
  { id:"oxford",    icon:"📜",  label:"Oxford",     desc:"Formal motion"  },
];
const TOPICS = [
  "AI will replace most jobs in 10 years",
  "Social media does more harm than good",
  "College education is no longer worth the cost",
  "Remote work is better than office work",
  "Smartphones have made us less happy",
  "Space exploration should be a top global priority",
];

// ── API ──────────────────────────────────────────────────────
async function chat(systemPrompt, history, userMsg) {
  const URL = process.env.NODE_ENV === "production" ? "/api/chat" : "http://localhost:3001/api/chat";
  const r = await fetch(URL, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ systemPrompt, messages:[...history,{role:"user",content:userMsg}] })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d.reply;
}

function parseScore(t) {
  const m = t.match(/Score:\s*(\d+)/i) || t.match(/(\d+)\/100/);
  return m ? Math.min(100, Math.max(0, parseInt(m[1]))) : null;
}

function buildPrompt({ topic, level, style, round, stance }) {
  const D = { Easy:"Be clear and accessible. 1-2 arguments.", Medium:"Use evidence and real examples.", Hard:"Identify logical fallacies. Be rigorous.", Expert:"Challenge every assumption relentlessly." };
  const S = { standard:"Give direct, structured rebuttals.", socratic:"Use probing questions to expose weaknesses.", crossexam:"Zero in on the single weakest point.", oxford:"Follow Oxford Union formal debate structure." };
  const you = stance==="for"?"IN FAVOUR OF":"AGAINST";
  const ai  = stance==="for"?"AGAINST":"IN FAVOUR OF";
  return `You are a sharp debate opponent. Topic: "${topic}". User argues ${you} — you argue ${ai}.\n${S[style]||S.standard} ${D[level]||D.Easy}\nRound ${round}.\n\nAfter round 1, always format:\nScore: [N]/100 — [one precise sentence of feedback]\n\n[Rebuttal: 2-3 sentences, no greeting, no filler]`;
}

// ── GLOBAL STYLES ────────────────────────────────────────────
const G = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:       #06060B;
  --surface:  #0D0D16;
  --line:     rgba(255,255,255,0.07);
  --text:     #F2F0FF;
  --muted:    rgba(242,240,255,0.35);
  --dim:      rgba(242,240,255,0.15);
  --indigo:   #5B4FE8;
  --indigo-l: #7B72F0;
  --indigo-d: #3D33C4;
  --amber:    #E8A23A;
  --green:    #2DD4A0;
  --red:      #E8524A;
  --serif:    'Instrument Serif', Georgia, serif;
  --sans:     'Inter', system-ui, sans-serif;
  --mono:     'JetBrains Mono', monospace;
  --r-sm:     8px;
  --r-md:     12px;
  --r-lg:     18px;
  --r-xl:     24px;
}

html, body, #root { background: var(--bg) !important; min-height: 100vh; }
body { font-family: var(--sans); color: var(--text); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
::selection { background: rgba(91,79,232,0.28); }
::-webkit-scrollbar { width: 2px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(91,79,232,0.3); border-radius: 2px; }

/* ── KEYFRAMES ── */
@keyframes reveal   { from { opacity:0; transform: translateY(18px); clip-path: inset(0 0 20px 0); } to { opacity:1; transform: none; clip-path: inset(0); } }
@keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
@keyframes slideIn  { from { opacity:0; transform: translateX(-10px) } to { opacity:1; transform: none } }
@keyframes slideInR { from { opacity:0; transform: translateX(10px)  } to { opacity:1; transform: none } }
@keyframes scaleUp  { from { opacity:0; transform: scale(0.85) } to { opacity:1; transform: scale(1) } }
@keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0.15} }
@keyframes pulse    { 0%,100%{opacity:0.6} 50%{opacity:1} }
@keyframes dot      { 0%,80%,100%{transform:translateY(0);opacity:.3} 40%{transform:translateY(-5px);opacity:1} }
@keyframes glow     { 0%,100%{box-shadow:0 0 0 0 rgba(91,79,232,0)} 50%{box-shadow:0 0 24px 4px rgba(91,79,232,0.25)} }
@keyframes scanline { 0%{top:-2px} 100%{top:100%} }
@keyframes countup  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
@keyframes border-spin { from{--angle:0deg} to{--angle:360deg} }
@keyframes shimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

/* ── ANIMATION CLASSES ── */
.r0  { animation: reveal .55s cubic-bezier(.16,1,.3,1) both; }
.r1  { animation: reveal .55s .06s cubic-bezier(.16,1,.3,1) both; }
.r2  { animation: reveal .55s .12s cubic-bezier(.16,1,.3,1) both; }
.r3  { animation: reveal .55s .18s cubic-bezier(.16,1,.3,1) both; }
.r4  { animation: reveal .55s .24s cubic-bezier(.16,1,.3,1) both; }
.r5  { animation: reveal .55s .30s cubic-bezier(.16,1,.3,1) both; }
.r6  { animation: reveal .55s .36s cubic-bezier(.16,1,.3,1) both; }
.fi  { animation: fadeIn .4s ease both; }
.si  { animation: slideIn  .3s cubic-bezier(.16,1,.3,1) both; }
.sir { animation: slideInR .3s cubic-bezier(.16,1,.3,1) both; }
.su  { animation: scaleUp  .35s cubic-bezier(.16,1,.3,1) both; }

/* ── INPUTS ── */
input, textarea {
  background: transparent;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  color: var(--text);
  padding: 13px 16px;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 400;
  width: 100%;
  outline: none;
  transition: border-color .18s, box-shadow .18s;
}
input:focus, textarea:focus {
  border-color: rgba(91,79,232,0.55);
  box-shadow: 0 0 0 3px rgba(91,79,232,0.07);
}
input::placeholder, textarea::placeholder { color: var(--dim); }
textarea { resize: none; line-height: 1.6; }

/* ── BUTTONS ── */
button { font-family: var(--sans); cursor: pointer; border: none; outline: none; }
button:active { opacity: .85; transform: scale(0.975); }

.btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  background: var(--indigo);
  color: #fff;
  border-radius: var(--r-md);
  padding: 12px 22px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.01em;
  transition: background .18s, transform .18s, box-shadow .18s;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.06) inset, 0 2px 12px rgba(91,79,232,0.28);
}
.btn-primary:hover { background: var(--indigo-l); transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(255,255,255,0.08) inset, 0 4px 20px rgba(91,79,232,0.38); }

.btn-ghost {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  background: rgba(255,255,255,0.04);
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 12px 18px;
  font-size: 13.5px;
  font-weight: 500;
  transition: all .18s;
}
.btn-ghost:hover { background: rgba(255,255,255,0.07); color: var(--text); border-color: rgba(255,255,255,0.12); }

.btn-end {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(45,212,160,0.06);
  color: var(--green);
  border: 1px solid rgba(45,212,160,0.18);
  border-radius: var(--r-md);
  padding: 11px 18px;
  font-size: 13px;
  font-weight: 500;
  transition: all .18s;
}
.btn-end:hover { background: rgba(45,212,160,0.1); border-color: rgba(45,212,160,0.3); }

.btn-icon {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  font-size: 16px;
  transition: all .18s;
  color: var(--muted);
}
.btn-icon:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.12); }
.btn-icon.rec  { border-color: rgba(232,82,74,0.4); background: rgba(232,82,74,0.07); animation: glow 1.5s ease infinite; }

/* ── LAYOUT ── */
.page { position: relative; min-height: 100vh; }
.wrap { max-width: 680px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }
.divider { height: 1px; background: var(--line); }

/* ── NAV ── */
.nav {
  position: sticky; top: 0; z-index: 200;
  border-bottom: 1px solid var(--line);
  background: rgba(6,6,11,0.82);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}
.nav-inner {
  max-width: 680px; margin: 0 auto; padding: 0 24px;
  height: 52px; display: flex; align-items: center; justify-content: space-between;
}
.wordmark {
  display: flex; align-items: center; gap: 9px;
  font-size: 14px; font-weight: 600; color: var(--text); letter-spacing: -0.02em;
}
.wordmark-icon {
  width: 26px; height: 26px; border-radius: 7px;
  background: linear-gradient(135deg, var(--indigo-d), var(--indigo-l));
  display: flex; align-items: center; justify-content: center;
  font-size: 13px;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.08) inset;
}
.beta-pill {
  font-size: 10px; font-weight: 500; letter-spacing: 0.05em;
  color: var(--indigo-l); background: rgba(91,79,232,0.1);
  border: 1px solid rgba(91,79,232,0.2);
  border-radius: 99px; padding: 2px 8px;
}

/* ── HERO ── */
.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 500; letter-spacing: 0.02em;
  color: var(--indigo-l);
  background: rgba(91,79,232,0.08);
  border: 1px solid rgba(91,79,232,0.16);
  border-radius: 99px; padding: 4px 12px; margin-bottom: 22px;
}
.hero-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--indigo-l); animation: pulse 2s ease infinite; }
.hero-h1 {
  font-family: var(--serif);
  font-style: italic;
  font-size: clamp(36px, 6vw, 54px);
  font-weight: 400;
  line-height: 1.06;
  letter-spacing: -0.02em;
  color: var(--text);
  margin-bottom: 18px;
}
.hero-accent {
  background: linear-gradient(135deg, var(--indigo-l) 0%, #A78BFA 60%, #C4B5FD 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-sub {
  font-size: 15px; font-weight: 400; color: var(--muted);
  line-height: 1.75; max-width: 420px; margin-bottom: 40px;
}

/* ── STYLE PICKER ── */
.style-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
.style-card {
  padding: 14px 10px; border-radius: var(--r-md);
  border: 1px solid var(--line);
  background: rgba(255,255,255,0.02);
  display: flex; flex-direction: column; align-items: center; gap: 7px;
  cursor: pointer; transition: all .18s; text-align: center;
}
.style-card:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); transform: translateY(-1px); }
.style-card.active {
  border-color: rgba(91,79,232,0.5);
  background: rgba(91,79,232,0.07);
  box-shadow: 0 0 0 1px rgba(91,79,232,0.12) inset;
}
.style-icon { font-size: 19px; line-height: 1; }
.style-label { font-size: 12px; font-weight: 600; color: var(--muted); letter-spacing: -0.01em; }
.style-desc  { font-size: 10px; color: var(--dim); }
.style-card.active .style-label { color: #A78BFA; }

/* ── STANCE PICKER ── */
.stance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stance-card {
  padding: 18px 16px; border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: rgba(255,255,255,0.02);
  cursor: pointer; transition: all .22s; text-align: left;
}
.stance-card:hover { background: rgba(255,255,255,0.04); transform: translateY(-1px); }
.stance-card.for.active   { border-color: rgba(45,212,160,0.4); background: rgba(45,212,160,0.05); }
.stance-card.against.active { border-color: rgba(232,82,74,0.35); background: rgba(232,82,74,0.05); }
.stance-emoji { font-size: 26px; margin-bottom: 10px; display: block; }
.stance-label { font-size: 14px; font-weight: 600; color: var(--muted); letter-spacing: -0.01em; margin-bottom: 3px; }
.stance-sub   { font-size: 11px; color: var(--dim); }
.stance-card.for.active   .stance-label { color: var(--green); }
.stance-card.against.active .stance-label { color: var(--red); }

/* ── CHIPS ── */
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip {
  display: inline-block;
  font-size: 12px; font-weight: 500;
  color: var(--dim); background: rgba(255,255,255,0.03);
  border: 1px solid var(--line); border-radius: 99px;
  padding: 5px 13px; cursor: pointer; transition: all .15s;
  white-space: nowrap;
}
.chip:hover { color: var(--indigo-l); border-color: rgba(91,79,232,0.3); background: rgba(91,79,232,0.06); transform: translateY(-1px); }

/* ── FEATURE LIST ── */
.feat-list { display: flex; flex-wrap: wrap; gap: 18px; }
.feat-item { font-size: 12px; font-weight: 500; color: var(--dim); display: flex; align-items: center; gap: 5px; }

/* ── STATS ROW ── */
.stats-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
.stat-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 13px 10px; text-align: center;
}
.stat-val  { font-family: var(--mono); font-size: 19px; font-weight: 500; color: var(--text); line-height: 1; letter-spacing: -0.02em; }
.stat-key  { font-size: 10px; font-weight: 500; color: var(--dim); margin-top: 5px; text-transform: uppercase; letter-spacing: 0.07em; }

/* ── ARENA ── */
.arena {
  background: rgba(255,255,255,0.018);
  border: 1px solid var(--line);
  border-radius: var(--r-xl);
  overflow: hidden;
  box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset;
}
.arena-header {
  padding: 16px 20px; border-bottom: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(91,79,232,0.04) 0%, transparent 100%);
}
.arena-topic { font-size: 15px; font-weight: 600; letter-spacing: -0.02em; color: var(--text); line-height: 1.4; margin-bottom: 10px; }
.arena-pills { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.a-pill {
  font-size: 11px; font-weight: 500; border-radius: 99px; padding: 3px 10px;
}

/* ── DEBATE STAGE (the signature element) ── */
.stage {
  display: grid;
  grid-template-columns: 1fr 3px 1fr;
  min-height: 280px;
  max-height: 420px;
  overflow: hidden;
}
.stage-col { display: flex; flex-direction: column; gap: 10px; padding: 18px 16px; overflow-y: auto; }
.stage-col:first-child { align-items: flex-end; }
.stage-col:last-child  { align-items: flex-start; }
.stage-divider {
  background: linear-gradient(180deg, transparent 0%, var(--indigo) 30%, var(--indigo) 70%, transparent 100%);
  opacity: 0.25;
  position: relative;
  flex-shrink: 0;
}
.stage-divider::after {
  content: 'VS';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%,-50%);
  font-family: var(--mono);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: 0.15em;
  color: var(--indigo-l);
  background: var(--surface);
  padding: 4px 0;
  writing-mode: vertical-rl;
  opacity: 0.7;
}

/* ── BUBBLES ── */
.bubble {
  max-width: 92%;
  padding: 11px 14px;
  font-size: 13.5px; line-height: 1.72; font-weight: 400;
  border-radius: var(--r-md);
}
.bubble-you {
  background: rgba(45,212,160,0.07);
  border: 1px solid rgba(45,212,160,0.12);
  color: rgba(167,243,208,0.85);
  border-radius: 14px 3px 14px 14px;
}
.bubble-ai  {
  background: rgba(91,79,232,0.07);
  border: 1px solid rgba(91,79,232,0.12);
  color: rgba(221,214,254,0.85);
  border-radius: 3px 14px 14px 14px;
}
.avatar {
  font-size: 10px; font-weight: 600; letter-spacing: 0.02em;
  padding: 2px 8px; border-radius: 99px; margin-bottom: 4px;
  display: inline-block;
}
.avatar-you { color: var(--green); background: rgba(45,212,160,0.1); }
.avatar-ai  { color: var(--indigo-l); background: rgba(91,79,232,0.1); }

/* ── SCORE BADGE ── */
.score-badge {
  grid-column: 1 / -1;
  display: flex; justify-content: center; align-items: center; padding: 4px 0;
}
.score-inner {
  display: inline-flex; align-items: center; gap: 9px;
  border-radius: 99px; padding: 5px 14px 5px 8px;
}
.score-ring {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--mono); font-size: 10px; font-weight: 500;
  border: 1.5px solid; flex-shrink: 0;
}
.score-label { font-size: 12px; font-weight: 500; }

/* ── TYPING DOTS ── */
.typing-wrap { display: flex; align-items: flex-start; flex-direction: column; gap: 4px; }
.typing-bubble {
  display: flex; gap: 5px; align-items: center;
  background: rgba(91,79,232,0.07);
  border: 1px solid rgba(91,79,232,0.12);
  border-radius: 3px 14px 14px 14px;
  padding: 13px 16px;
}
.dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(167,139,250,0.5); }

/* ── SCORE BARS ── */
.score-bars { padding: 14px 20px; border-top: 1px solid var(--line); }
.bar-row { display: flex; gap: 5px; align-items: flex-end; height: 56px; }
.bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.bar-num { font-family: var(--mono); font-size: 8px; color: var(--dim); }
.bar-fill { width: 100%; border-radius: 3px 3px 0 0; min-height: 2px; transition: height .6s cubic-bezier(.16,1,.3,1); }
.bar-r { font-family: var(--mono); font-size: 8px; color: var(--dim); }

/* ── INPUT ZONE ── */
.input-zone { padding: 14px 18px; border-top: 1px solid var(--line); background: rgba(0,0,0,0.18); }
.input-row  { display: flex; gap: 8px; align-items: flex-end; margin-top: 10px; }
.input-left { display: flex; gap: 7px; align-items: center; }
.input-right{ display: flex; gap: 7px; align-items: center; }
.rec-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--red); animation: blink 1s ease infinite; }

/* ── SUMMARY ── */
.grade-block {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 24px; border-radius: var(--r-lg); border: 1px solid;
}
.grade-letter { font-family: var(--serif); font-size: 60px; font-weight: 400; line-height: 1; }
.section-card { background: rgba(255,255,255,0.018); border: 1px solid var(--line); border-radius: var(--r-lg); overflow: hidden; }
.section-head { padding: 15px 20px; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 9px; }
.section-body { padding: 18px 20px; }
.debrief-item { padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid var(--line); }
.debrief-item:last-child { padding-bottom: 0; margin-bottom: 0; border-bottom: none; }
.debrief-tag { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.09em; color: var(--indigo-l); margin-bottom: 7px; display: flex; align-items: center; gap: 6px; }
.debrief-tag::before { content:''; display:block; width:3px; height:12px; background: var(--indigo); border-radius: 99px; }
.debrief-body { font-size: 13.5px; font-weight: 400; color: var(--muted); line-height: 1.8; white-space: pre-wrap; }
.loading-line {
  height: 13px; border-radius: 4px;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease infinite;
  margin-bottom: 10px;
}

/* ── SECTION LABEL ── */
.sec-label {
  font-size: 11px; font-weight: 500; text-transform: uppercase;
  letter-spacing: 0.07em; color: var(--dim); margin-bottom: 9px;
}
`;

// ── BG ───────────────────────────────────────────────────────
function Bg() {
  return (
    <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
      {/* Noise */}
      <div style={{position:"absolute",inset:0,opacity:.03,backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,backgroundSize:"200px"}} />
      {/* Indigo bloom — top right */}
      <div style={{position:"absolute",width:640,height:640,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(91,79,232,0.12) 0%,transparent 65%)",top:-180,right:-160,pointerEvents:"none"}} />
      {/* Green bloom — bottom left */}
      <div style={{position:"absolute",width:480,height:480,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(45,212,160,0.06) 0%,transparent 65%)",bottom:-100,left:-80,pointerEvents:"none"}} />
      {/* Top hairline */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent 0%,rgba(91,79,232,0.35) 40%,rgba(91,79,232,0.35) 60%,transparent 100%)"}} />
    </div>
  );
}

// ── NAV ──────────────────────────────────────────────────────
function Nav({ onBack }) {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="wordmark">
          {onBack && (
            <button onClick={onBack} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontSize:13,fontFamily:"var(--sans)",fontWeight:500,padding:"4px 8px 4px 0",transition:"color .15s"}} onMouseEnter={e=>e.target.style.color="var(--text)"} onMouseLeave={e=>e.target.style.color="var(--muted)"}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
          )}
          <div className="wordmark-icon">⚖️</div>
          <span>Debate Arena</span>
        </div>
        <span className="beta-pill">Beta</span>
      </div>
    </nav>
  );
}

// ── STAT ─────────────────────────────────────────────────────
function Stat({ val, label, color }) {
  return (
    <div className="stat-card">
      <div className="stat-val" style={color?{color}:{}}>{val}</div>
      <div className="stat-key">{label}</div>
    </div>
  );
}

// ── SCORE BADGE ──────────────────────────────────────────────
function ScoreBadge({ score }) {
  const hi = score>=70, mid = score>=50;
  const c  = hi?"#2DD4A0":mid?"#E8A23A":"#E8524A";
  const bg = hi?"rgba(45,212,160,0.07)":mid?"rgba(232,162,58,0.07)":"rgba(232,82,74,0.07)";
  const br = hi?"rgba(45,212,160,0.18)":mid?"rgba(232,162,58,0.18)":"rgba(232,82,74,0.18)";
  return (
    <div className="score-badge su">
      <div className="score-inner" style={{background:bg,border:`1px solid ${br}`}}>
        <div className="score-ring" style={{borderColor:c,color:c}}>{score}</div>
        <span className="score-label" style={{color:c}}>{hi?"Strong":mid?"Developing":"Needs work"}</span>
      </div>
    </div>
  );
}

// ── TYPING ───────────────────────────────────────────────────
function Typing() {
  return (
    <div className="typing-wrap si">
      <span className="avatar avatar-ai">AI</span>
      <div className="typing-bubble">
        {[0,.18,.36].map((d,i)=><div key={i} className="dot" style={{animation:`dot 1.2s ${d}s ease infinite`}}/>)}
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
export default function DebateArena() {
  const [screen,  setScreen]  = useState("start");
  const [topic,   setTopic]   = useState("");
  const [style,   setStyle]   = useState("standard");
  const [stance,  setStance]  = useState("for");
  const [msgs,    setMsgs]    = useState([]);
  const [hist,    setHist]    = useState([]);
  const [scores,  setScores]  = useState([]);
  const [lvIdx,   setLvIdx]   = useState(0);
  const [round,   setRound]   = useState(1);
  const [inp,     setInp]     = useState("");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);
  const [listen,  setListen]  = useState(false);
  const [speak,   setSpeak]   = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [summary, setSummary] = useState(null);
  const [sumLoad, setSumLoad] = useState(false);

  const recRef  = useRef(null);
  const endYouRef = useRef(null);
  const endAiRef  = useRef(null);
  const level   = LEVELS[lvIdx];
  const LC      = {Easy:"#2DD4A0",Medium:"#E8A23A",Hard:"#E8524A",Expert:"#A78BFA"};

  useEffect(()=>{
    endYouRef.current?.scrollIntoView({behavior:"smooth"});
    endAiRef.current?.scrollIntoView({behavior:"smooth"});
  },[msgs,loading]);

  useEffect(()=>{
    if(scores.length>=2){
      const avg=scores.slice(-2).reduce((a,b)=>a+b,0)/2;
      if(avg>=72&&lvIdx<3) setLvIdx(i=>i+1);
    }
  },[scores,lvIdx]);

  const startListen=useCallback(()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Use Chrome for voice input.");return;}
    const r=new SR(); r.lang="en-US"; r.interimResults=true; r.continuous=true;
    r.onstart=()=>setListen(true);
    r.onresult=(e)=>setInp(Array.from(e.results).map(x=>x[0].transcript).join(" "));
    r.onend=()=>setListen(false);
    r.onerror=(e)=>{if(e.error!=="no-speech")setListen(false);};
    recRef.current=r; r.start();
  },[]);
  const stopListen=useCallback(()=>{recRef.current?.stop();setListen(false);},[]);

  const speakText=useCallback((t)=>{
    if(!voiceOn)return;
    const clean=t.replace(/Score:\s*\d+\/100\s*[—-]\s*.*/gi,"").trim();
    if(!clean)return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(clean); u.lang="en-US"; u.rate=1.05;
    const v=window.speechSynthesis.getVoices().find(v=>v.name.includes("Google UK English Male")||v.name.includes("Daniel")); if(v)u.voice=v;
    u.onstart=()=>setSpeak(true); u.onend=()=>setSpeak(false); u.onerror=()=>setSpeak(false);
    window.speechSynthesis.speak(u);
  },[voiceOn]);
  const stopSpeak=useCallback(()=>{window.speechSynthesis.cancel();setSpeak(false);},[]);

  const addMsg=(role,text)=>setMsgs(p=>[...p,{role,text}]);

  async function goDebate(){
    if(!topic.trim())return;
    setScreen("debate");setMsgs([]);setHist([]);setScores([]);setLvIdx(0);setRound(1);setLoading(true);setErr(null);
    try{
      const sys=buildPrompt({topic,level:"Easy",style,round:1,stance});
      const rep=await chat(sys,[],"Make your opening argument. 2-3 sentences, bold and direct. No greeting.");
      addMsg("ai",rep); speakText(rep);
      setHist([{role:"user",content:"Make your opening argument."},{role:"assistant",content:rep}]);
    }catch(e){setErr(e.message);}
    finally{setLoading(false);}
  }

  async function argue(){
    if(!inp.trim()||loading)return;
    const txt=inp.trim(); setInp(""); addMsg("user",txt); setLoading(true); setErr(null);
    try{
      const sys=buildPrompt({topic,level,style,round,stance});
      const rep=await chat(sys,hist,txt);
      setHist(p=>[...p,{role:"user",content:txt},{role:"assistant",content:rep}]);
      const lines=rep.split("\n").filter(l=>l.trim());
      let gLine="",reb=[];
      for(const l of lines){if(l.match(/^Score:/i)||l.match(/^\d+\/100/))gLine=l;else reb.push(l);}
      const sc=parseScore(rep);
      if(sc!==null){setScores(p=>[...p,sc]);if(gLine)addMsg("grade",gLine);}
      if(reb.length){const t=reb.join(" ");addMsg("ai",t);speakText(t);}
      setRound(r=>r+1);
    }catch(e){setErr(e.message);}
    finally{setLoading(false);}
  }

  async function endDebate(){
    stopSpeak(); setScreen("summary"); setSumLoad(true);
    const transcript=msgs.map(m=>`[${m.role==="ai"?"AI":m.role==="grade"?"SCORE":"YOU"}]: ${m.text}`).join("\n\n");
    const avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
    const trend=scores[scores.length-1]>scores[0]?"improving":scores[scores.length-1]<scores[0]?"declining":"steady";
    const p=`You are an elite debate coach.\n\nTOPIC: "${topic}"\nUSER ARGUED: ${stance==="for"?"FOR":"AGAINST"}\nROUNDS: ${scores.length}\nSCORES: ${scores.join(", ")} (Avg ${avg}/100, ${trend})\n\nTRANSCRIPT:\n${transcript}\n\nWrite a precise, expert coaching debrief:\n\n## Overall Grade\n[Letter A-F] — [One crisp verdict sentence.]\n\n## What You Did Well\n[2 specific strengths. Reference exact lines they used.]\n\n## Critical Weakness\n[Name it clearly. Quote the line that exposed it.]\n\n## Two Drills\nDrill 1: [Specific daily practice]\nDrill 2: [Technique to master]\n\n## Next Challenge\n[One motivating sentence. Suggest a harder topic.]\n\nBe ruthlessly honest, specific, and useful.`;
    try{
      const URL=process.env.NODE_ENV==="production"?"/api/chat":"http://localhost:3001/api/chat";
      const r=await fetch(URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({systemPrompt:p,messages:[{role:"user",content:"Debrief."}]})});
      const d=await r.json(); if(d.error)throw new Error(d.error);
      setSummary(d.reply);
    }catch(e){setSummary("Error: "+e.message);}
    finally{setSumLoad(false);}
  }

  const avg=scores.length>0?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;


  // ══ START ══════════════════════════════════════════════════
  if(screen==="start") return (
    <div className="page">
      <style>{G}</style>
      <Bg/>
      <Nav/>
      <div className="wrap" style={{paddingTop:64,paddingBottom:80}}>

        {/* Hero */}
        <div className="r0" style={{marginBottom:52}}>
          <div className="hero-eyebrow"><div className="hero-dot"/>AI Debate Training · 2026</div>
          <h1 className="hero-h1">
            Argue better.<br/>
            <em className="hero-accent">Think sharper.</em>
          </h1>
          <p className="hero-sub">The AI takes the opposing side, escalates as you improve, and gives you a personal coach debrief after every session.</p>
        </div>

        {/* Style */}
        <div className="r1" style={{marginBottom:28}}>
          <div className="sec-label">Debate style</div>
          <div className="style-grid">
            {STYLES.map(s=>(
              <button key={s.id} onClick={()=>setStyle(s.id)} className={`style-card${style===s.id?" active":""}`}>
                <span className="style-icon">{s.icon}</span>
                <span className="style-label">{s.label}</span>
                <span className="style-desc">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stance */}
        <div className="r2" style={{marginBottom:28}}>
          <div className="sec-label">Your position</div>
          <div className="stance-grid">
            {[
              {val:"for",    cls:"for",    emoji:"👍", label:"Argue For",     sub:"You support the motion"},
              {val:"against",cls:"against",emoji:"👎", label:"Argue Against",  sub:"You oppose the motion"},
            ].map(s=>(
              <button key={s.val} onClick={()=>setStance(s.val)} className={`stance-card ${s.cls}${stance===s.val?" active":""}`}>
                <span className="stance-emoji">{s.emoji}</span>
                <div className="stance-label">{s.label}</div>
                <div className="stance-sub">{s.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Topic */}
        <div className="r3" style={{marginBottom:14}}>
          <div className="sec-label">Topic</div>
          <div style={{display:"flex",gap:9}}>
            <input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&goDebate()} placeholder="Enter any debate topic…" style={{flex:1,fontSize:14.5}}/>
            <button className="btn-primary" onClick={goDebate} style={{flexShrink:0,whiteSpace:"nowrap"}}>
              Enter Arena
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>

        <div className="r4">
          <div className="chips">
            {TOPICS.map(t=><button key={t} className="chip" onClick={()=>setTopic(t)}>{t}</button>)}
          </div>
        </div>

        {/* Features */}
        <div className="r5" style={{marginTop:48,paddingTop:24,borderTop:"1px solid var(--line)"}}>
          <div className="feat-list">
            {["🎙 Voice input","🔊 AI voice responses","📈 Adaptive difficulty","🏆 Coach debrief after session","⚡ Real-time argument scoring"].map(f=>(
              <div key={f} className="feat-item">{f}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ══ SUMMARY ════════════════════════════════════════════════
  if(screen==="summary"){
    const avg2=scores.length>0?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
    const grade=avg2>=85?"A":avg2>=70?"B":avg2>=55?"C":avg2>=40?"D":"F";
    const gc=avg2>=85?"#2DD4A0":avg2>=70?"#A78BFA":avg2>=55?"#E8A23A":"#E8524A";
    const gcRgb=avg2>=85?"45,212,160":avg2>=70?"167,139,250":avg2>=55?"232,162,58":"232,82,74";
    const sects=summary?summary.split(/\n## /).map((s,i)=>i===0?s.replace(/^## /,""):s):[];
    const icons=["🏆","✅","⚠️","💪","🎯"];

    return (
      <div className="page">
        <style>{G}</style>
        <Bg/>
        <Nav onBack={()=>{setScreen("start");setSummary(null);setScores([]);setRound(1);setMsgs([]);setHist([]);setLvIdx(0);}}/>
        <div className="wrap" style={{paddingTop:40,paddingBottom:80}}>

          {/* Heading */}
          <div className="r0" style={{marginBottom:32}}>
            <div style={{fontSize:11,fontWeight:500,color:"var(--dim)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Session complete</div>
            <h1 style={{fontFamily:"var(--serif)",fontStyle:"italic",fontSize:32,fontWeight:400,letterSpacing:"-0.02em",color:"var(--text)",marginBottom:6,lineHeight:1.2}}>{topic}</h1>
            <p style={{fontSize:13,color:"var(--dim)"}}>You argued {stance==="for"?"for":"against"} · {scores.length} rounds · reached {level}</p>
          </div>

          {/* Grade + stats */}
          <div className="r1" style={{display:"grid",gridTemplateColumns:"auto 1fr 1fr 1fr",gap:10,marginBottom:20}}>
            <div className="grade-block" style={{background:`rgba(${gcRgb},0.06)`,borderColor:`rgba(${gcRgb},0.2)`,minWidth:90}}>
              <div className="grade-letter" style={{color:gc,textShadow:`0 0 40px rgba(${gcRgb},0.45)`}}>{grade}</div>
              <div style={{fontSize:10,fontWeight:500,color:`rgba(${gcRgb},0.55)`,marginTop:6,textTransform:"uppercase",letterSpacing:"0.09em"}}>Grade</div>
            </div>
            <Stat val={`${avg2}%`}      label="Avg Score"   color={gc}/>
            <Stat val={scores.length}   label="Rounds"/>
            <Stat val={level}           label="Final Level" color={LC[level]}/>
          </div>

          {/* Score bars */}
          <div className="r2 section-card" style={{marginBottom:16}}>
            <div className="section-head">
              <span style={{fontSize:13}}>📊</span>
              <span style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>Score per round</span>
            </div>
            <div className="score-bars">
              <div className="bar-row">
                {scores.map((s,i)=>{
                  const c=s>=70?"#2DD4A0":s>=50?"#E8A23A":"#E8524A";
                  return(
                    <div key={i} className="bar-wrap">
                      <div className="bar-num">{s}</div>
                      <div className="bar-fill" style={{height:`${(s/100)*38}px`,background:`linear-gradient(180deg,${c},${c}66)`,boxShadow:s>=70?`0 0 8px rgba(45,212,160,0.3)`:""}}/>
                      <div className="bar-r">R{i+1}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Debrief */}
          <div className="r3 section-card" style={{marginBottom:20}}>
            <div className="section-head">
              <div style={{width:30,height:30,borderRadius:8,background:"rgba(91,79,232,0.1)",border:"1px solid rgba(91,79,232,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🎓</div>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:"var(--text)",letterSpacing:"-0.01em"}}>Coach Debrief</div>
                <div style={{fontSize:11,color:"var(--dim)",marginTop:1}}>Personalized analysis of your performance</div>
              </div>
            </div>
            <div className="section-body">
              {sumLoad?(
                <div>
                  {[80,60,90,50,70].map((w,i)=><div key={i} className="loading-line" style={{width:`${w}%`}}/>)}
                </div>
              ):sects.map((sec,i)=>{
                const lines=sec.split("\n"); const heading=lines[0]; const body=lines.slice(1).join("\n").trim();
                return(
                  <div key={i} className="debrief-item">
                    {heading&&<div className="debrief-tag">{icons[i]||"•"}&nbsp;{heading}</div>}
                    <div className="debrief-body">{body}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="r4" style={{display:"flex",gap:10}}>
            <button className="btn-primary" style={{flex:1,padding:"13px"}} onClick={()=>{setScreen("start");setSummary(null);setScores([]);setRound(1);setMsgs([]);setHist([]);setLvIdx(0);}}>Debate again</button>
            <button className="btn-ghost" style={{flex:1,padding:"13px"}} onClick={()=>{
              const t=[`Debate Session — ${new Date().toLocaleDateString()}`,`Topic: ${topic}`,`Side: ${stance==="for"?"FOR":"AGAINST"}`,`Grade: ${grade} · Avg: ${avg2}% · Rounds: ${scores.length}`,"─".repeat(48),summary||""].join("\n");
              const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([t],{type:"text/plain"})); a.download="debate-session.txt"; a.click();
            }}>Save report</button>
          </div>
        </div>
      </div>
    );
  }

  // ══ DEBATE ════════════════════════════════════════════════
  // Split messages into two columns — the signature element
  const allTurns = msgs.reduce((acc,m,i)=>{
    if(m.role==="grade"){
      // attach score to last turn
      if(acc.length>0) acc[acc.length-1].score=parseScore(m.text);
    } else {
      acc.push({...m,idx:i});
    }
    return acc;
  },[]);

  const youTurns = allTurns.filter(m=>m.role==="user");
  const aiTurns  = allTurns.filter(m=>m.role==="ai");

  return (
    <div className="page">
      <style>{G}</style>
      <Bg/>
      <Nav onBack={()=>setScreen("start")}/>
      <div className="wrap" style={{paddingTop:20,paddingBottom:40}}>

        {/* Stats */}
        <div className="stats-row r0" style={{marginBottom:14}}>
          <Stat val={round}  label="Round"/>
          <Stat val={avg!==null?`${avg}%`:"—"} label="Avg Score" color={avg!==null?(avg>=70?"#2DD4A0":avg>=50?"#E8A23A":"#E8524A"):undefined}/>
          <Stat val={level}  label="Level" color={LC[level]}/>
          <Stat val={scores.length} label="Arguments"/>
        </div>

        {/* Arena */}
        <div className="arena r1">
          {/* Header */}
          <div className="arena-header">
            <div className="arena-topic">{topic}</div>
            <div className="arena-pills">
              <span className="a-pill" style={{background:stance==="for"?"rgba(45,212,160,0.08)":"rgba(232,82,74,0.08)",color:stance==="for"?"#2DD4A0":"#E8524A",border:`1px solid ${stance==="for"?"rgba(45,212,160,0.2)":"rgba(232,82,74,0.2)"}`}}>
                You {stance==="for"?"👍 For":"👎 Against"}
              </span>
              <span className="a-pill" style={{background:"rgba(91,79,232,0.08)",color:"#A78BFA",border:"1px solid rgba(91,79,232,0.2)"}}>
                AI {stance==="for"?"👎 Against":"👍 For"}
              </span>
              <span className="a-pill" style={{background:"rgba(255,255,255,0.03)",color:"var(--dim)",border:"1px solid var(--line)",fontFamily:"var(--mono)",fontSize:10}}>
                R{round}
              </span>
              {speak&&<span className="a-pill" style={{background:"rgba(91,79,232,0.08)",color:"#A78BFA",border:"1px solid rgba(91,79,232,0.2)",animation:"pulse 1.5s ease infinite"}}>🔊 Speaking</span>}
            </div>
          </div>

          {/* ── THE STAGE: TWO-COLUMN VERSUS LAYOUT ── */}
          <div className="stage">
            {/* YOUR SIDE */}
            <div className="stage-col">
              <div style={{fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.12em",color:"var(--dim)",marginBottom:4,fontFamily:"var(--mono)"}}>You</div>
              {youTurns.length===0&&!loading&&(
                <div style={{fontSize:12,color:"var(--dim)",opacity:.5,textAlign:"right",paddingTop:20}}>Your arguments appear here</div>
              )}
              {youTurns.map((m,i)=>(
                <div key={i} className="sir" style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                  <div className="bubble bubble-you">{m.text}</div>
                  {m.score!=null&&(
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontFamily:"var(--mono)",fontSize:10,color:m.score>=70?"#2DD4A0":m.score>=50?"#E8A23A":"#E8524A",fontWeight:500}}>{m.score}/100</span>
                      <div style={{width:32,height:3,borderRadius:99,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                        <div style={{width:`${m.score}%`,height:"100%",background:m.score>=70?"#2DD4A0":m.score>=50?"#E8A23A":"#E8524A",borderRadius:99,transition:"width .6s"}}/>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={endYouRef}/>
            </div>

            {/* DIVIDER */}
            <div className="stage-divider"/>

            {/* AI SIDE */}
            <div className="stage-col">
              <div style={{fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.12em",color:"var(--dim)",marginBottom:4,fontFamily:"var(--mono)"}}>AI Opponent</div>
              {aiTurns.length===0&&!loading&&(
                <div style={{fontSize:12,color:"var(--dim)",opacity:.5,paddingTop:20}}>AI arguments appear here</div>
              )}
              {aiTurns.map((m,i)=>(
                <div key={i} className="si" style={{display:"flex",flexDirection:"column",gap:3}}>
                  <div className="bubble bubble-ai">{m.text}</div>
                </div>
              ))}
              {loading&&<Typing/>}
              {err&&<div style={{color:"#E8524A",fontSize:12,padding:8}}>Error: {err}</div>}
              <div ref={endAiRef}/>
            </div>
          </div>

          {/* Score line for last scored round — centered */}
          {scores.length>0&&(
            <div style={{display:"flex",justifyContent:"center",padding:"8px 0",borderTop:"1px solid var(--line)"}}>
              <ScoreBadge score={scores[scores.length-1]}/>
            </div>
          )}

          {/* Score bars (3+ rounds) */}
          {scores.length>=3&&(
            <div className="score-bars" style={{borderTop:"1px solid var(--line)"}}>
              <div className="sec-label" style={{marginBottom:8}}>Score trend</div>
              <div className="bar-row">
                {scores.map((s,i)=>{
                  const c=s>=70?"#2DD4A0":s>=50?"#E8A23A":"#E8524A";
                  return(
                    <div key={i} className="bar-wrap">
                      <div className="bar-num">{s}</div>
                      <div className="bar-fill" style={{height:`${(s/100)*38}px`,background:c,opacity:.75}}/>
                      <div className="bar-r">R{i+1}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="input-zone">
            <textarea value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();argue();}}} placeholder="State your argument… (↵ to send)" disabled={loading} rows={3}/>
            <div className="input-row">
              <div className="input-left">
                {scores.length>=1&&(
                  <button className="btn-end" onClick={endDebate}>End &amp; Review</button>
                )}
                <button onClick={()=>{setVoiceOn(v=>!v);stopSpeak();}} style={{background:"none",border:"none",fontSize:14,color:voiceOn?"var(--muted)":"var(--dim)",cursor:"pointer",padding:"6px",borderRadius:6,transition:"color .15s"}}>
                  {voiceOn?"🔊":"🔇"}
                </button>
              </div>
              <div className="input-right">
                {listen&&<div style={{display:"flex",alignItems:"center",gap:5}}><div className="rec-dot"/><span style={{fontSize:11,color:"#E8524A",fontWeight:600,fontFamily:"var(--mono)"}}>REC</span></div>}
                <button className={`btn-icon${listen?" rec":""}`} onClick={listen?stopListen:startListen} disabled={loading} title={listen?"Stop":"Speak"}>
                  {listen?"⏹":"🎙️"}
                </button>
                <button id="argue-btn" className="btn-primary" onClick={argue} disabled={loading} style={{opacity:loading?.65:1}}>
                  {loading?(
                    <span style={{display:"flex",alignItems:"center",gap:6}}>
                      {[0,.15,.3].map((d,i)=><div key={i} style={{width:4,height:4,borderRadius:"50%",background:"rgba(255,255,255,0.6)",animation:`dot 1.2s ${d}s ease infinite`}}/>)}
                    </span>
                  ):"Argue →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
