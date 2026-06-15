import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG ──────────────────────────────────────────────────
const LEVELS = ["Easy", "Medium", "Hard", "Expert"];
const DEBATE_STYLES = [
  { id: "standard",  label: "Standard",   icon: "⚖️",  desc: "Direct rebuttals" },
  { id: "socratic",  label: "Socratic",   icon: "🏛️",  desc: "Question-driven" },
  { id: "crossexam", label: "Cross-Exam", icon: "🔍",  desc: "Attack weak points" },
  { id: "oxford",    label: "Oxford",     icon: "📜",  desc: "Formal structure" },
];
const SAMPLE_TOPICS = [
  "AI will replace most jobs in 10 years",
  "Social media does more harm than good",
  "College education is no longer worth the cost",
  "Remote work is better than office work",
  "Smartphones have made us less happy",
  "Space exploration should be a top global priority",
];

// ─── API ─────────────────────────────────────────────────────
async function callClaude(systemPrompt, conversationHistory, newUserMsg) {
  const messages = [...conversationHistory, { role: "user", content: newUserMsg }];
  const API_URL = process.env.NODE_ENV === "production" ? "/api/chat" : "http://localhost:3001/api/chat";
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, messages }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.reply;
}

function parseScore(text) {
  const m = text.match(/Score:\s*(\d+)/i) || text.match(/(\d+)\/100/);
  return m ? Math.min(100, Math.max(0, parseInt(m[1]))) : null;
}

function buildPrompt({ topic, level, style, round, stance }) {
  const lvl = { Easy: "Use 1–2 clear points. Be approachable.", Medium: "Use evidence and examples. Be analytical.", Hard: "Expose logical fallacies. Be rigorous.", Expert: "Challenge every assumption. Be relentless." };
  const sty = { standard: "Deliver direct rebuttals.", socratic: "Respond with probing Socratic questions.", crossexam: "Attack the single weakest part of their argument.", oxford: "Use formal Oxford-style structure." };
  const userSide = stance === "for" ? "IN FAVOUR of" : "AGAINST";
  const aiSide   = stance === "for" ? "AGAINST"      : "IN FAVOUR of";
  return `You are a skilled debate opponent. Topic: "${topic}". User argues ${userSide} — you argue ${aiSide}.\nStyle: ${sty[style] || sty.standard}\nDifficulty: ${lvl[level] || lvl.Easy}\nRound: ${round}\n\nFormat every response after round 1:\nScore: [0-100]/100 — [one sentence of specific feedback]\n\n[Your rebuttal in 2-3 sentences]\n\nBe direct. No greetings.`;
}

// ─── CSS ─────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Cal+Sans&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #root {
  background: #080810 !important;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #e8e8f0;
  -webkit-font-smoothing: antialiased;
}

::selection { background: rgba(124,58,237,0.3); color: #fff; }

::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.25); border-radius: 99px; }

/* ── KEYFRAMES ── */
@keyframes fadeUp    { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
@keyframes slideR    { from { opacity:0; transform:translateX(-12px) } to { opacity:1; transform:translateX(0) } }
@keyframes slideL    { from { opacity:0; transform:translateX(12px) } to { opacity:1; transform:translateX(0) } }
@keyframes popIn     { 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
@keyframes blink     { 0%,100%{opacity:1} 50%{opacity:0.2} }
@keyframes gradMove  { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes orb1      { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.05)} 66%{transform:translate(-20px,15px) scale(0.97)} }
@keyframes orb2      { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-25px,20px) scale(1.03)} 66%{transform:translate(20px,-15px) scale(0.98)} }
@keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes dot       { 0%,80%,100%{transform:scale(0.6);opacity:0.3} 40%{transform:scale(1);opacity:1} }
@keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes scanH     { from{transform:translateY(-100%)} to{transform:translateY(100vh)} }
@keyframes borderAnim{ 0%,100%{opacity:0.3} 50%{opacity:0.7} }
@keyframes scoreIn   { 0%{clip-path:inset(0 100% 0 0)} 100%{clip-path:inset(0 0% 0 0)} }

.fu  { animation: fadeUp 0.5s cubic-bezier(.16,1,.3,1) both; }
.fu1 { animation: fadeUp 0.5s .07s cubic-bezier(.16,1,.3,1) both; }
.fu2 { animation: fadeUp 0.5s .14s cubic-bezier(.16,1,.3,1) both; }
.fu3 { animation: fadeUp 0.5s .21s cubic-bezier(.16,1,.3,1) both; }
.fu4 { animation: fadeUp 0.5s .28s cubic-bezier(.16,1,.3,1) both; }
.fu5 { animation: fadeUp 0.5s .35s cubic-bezier(.16,1,.3,1) both; }
.fi  { animation: fadeIn 0.4s ease both; }
.msg-ai   { animation: slideR 0.3s cubic-bezier(.16,1,.3,1) both; }
.msg-user { animation: slideL 0.3s cubic-bezier(.16,1,.3,1) both; }
.msg-score{ animation: popIn  0.35s cubic-bezier(.16,1,.3,1) both; }

input, textarea {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  color: #e8e8f0;
  padding: 12px 16px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  width: 100%;
  outline: none;
  transition: border-color .2s, box-shadow .2s, background .2s;
  line-height: 1.5;
}
input:focus, textarea:focus {
  border-color: rgba(124,58,237,0.5);
  background: rgba(124,58,237,0.04);
  box-shadow: 0 0 0 3px rgba(124,58,237,0.08);
}
input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); font-weight: 400; }
textarea { resize: none; }

button { font-family: inherit; cursor: pointer; border: none; outline: none; transition: all .18s; }
button:active { transform: scale(0.97); }

.btn-cta {
  background: #7c3aed;
  color: #fff;
  border-radius: 10px;
  padding: 11px 22px;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 0 rgba(255,255,255,0.1) inset, 0 4px 16px rgba(124,58,237,0.35);
}
.btn-cta:hover { background: #6d28d9; transform: translateY(-1px); box-shadow: 0 1px 0 rgba(255,255,255,0.1) inset, 0 6px 20px rgba(124,58,237,0.45); }
.btn-cta::after { content:''; position:absolute; inset:0; background:linear-gradient(180deg,rgba(255,255,255,0.08) 0%,transparent 100%); pointer-events:none; border-radius:inherit; }

.btn-secondary {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.09);
  color: rgba(255,255,255,0.5);
  border-radius: 10px;
  padding: 11px 18px;
  font-size: 13px;
  font-weight: 500;
}
.btn-secondary:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.14); color: rgba(255,255,255,0.75); transform: translateY(-1px); }

.btn-end {
  background: rgba(16,185,129,0.07);
  border: 1px solid rgba(16,185,129,0.2);
  color: #34d399;
  border-radius: 10px;
  padding: 11px 18px;
  font-size: 13px;
  font-weight: 500;
}
.btn-end:hover { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.35); transform: translateY(-1px); }

.surface {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}
.surface::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg, rgba(255,255,255,0.025) 0%, transparent 60%);
  pointer-events: none;
  border-radius: inherit;
}

.label {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.chip {
  display: inline-block;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 99px;
  padding: 5px 13px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255,255,255,0.35);
  cursor: pointer;
  transition: all .18s;
  white-space: nowrap;
}
.chip:hover { background: rgba(124,58,237,0.1); border-color: rgba(124,58,237,0.3); color: #c4b5fd; transform: translateY(-1px); }

.mic-active {
  animation: blink 1.2s ease infinite;
}

/* Noise texture overlay */
.noise::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 150px;
}
`;

// ─── BACKGROUND ──────────────────────────────────────────────
function Bg() {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden" }}>
      {/* Noise */}
      <div style={{ position:"absolute", inset:0, opacity:0.035, backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize:"180px" }} />
      {/* Gradient mesh */}
      <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%", background:"radial-gradient(ellipse, rgba(109,40,217,0.14) 0%, transparent 65%)", top:-200, right:-150, animation:"orb1 12s ease infinite" }} />
      <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", background:"radial-gradient(ellipse, rgba(16,185,129,0.07) 0%, transparent 65%)", bottom:-100, left:-100, animation:"orb2 15s ease infinite" }} />
      <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", background:"radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 65%)", top:"45%", left:"35%", animation:"float 9s 2s ease infinite" }} />
      {/* Thin horizontal line */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"1px", background:"linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.3) 50%, transparent 100%)" }} />
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────
function Nav({ onBack, showBack }) {
  return (
    <div style={{ position:"sticky", top:0, zIndex:100, borderBottom:"1px solid rgba(255,255,255,0.06)", background:"rgba(8,8,16,0.8)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)" }}>
      <div style={{ maxWidth:720, margin:"0 auto", padding:"0 24px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {showBack && (
            <button onClick={onBack} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.35)", fontSize:13, cursor:"pointer", padding:"4px 8px 4px 0", display:"flex", alignItems:"center", gap:6, transition:"color .15s" }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:24, height:24, borderRadius:6, background:"linear-gradient(135deg,#6d28d9,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>⚖️</div>
            <span style={{ fontSize:14, fontWeight:600, color:"#e8e8f0", letterSpacing:"-0.02em" }}>Debate Arena</span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.25)", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:99, padding:"3px 10px" }}>Beta</div>
        </div>
      </div>
    </div>
  );
}

// ─── SCORE PILL ───────────────────────────────────────────────
function ScorePill({ score }) {
  const isHigh = score >= 70, isMid = score >= 50;
  const color  = isHigh ? "#34d399" : isMid ? "#fbbf24" : "#f87171";
  const bg     = isHigh ? "rgba(16,185,129,0.08)" : isMid ? "rgba(251,191,36,0.08)" : "rgba(248,113,113,0.08)";
  const border = isHigh ? "rgba(16,185,129,0.2)"  : isMid ? "rgba(251,191,36,0.2)"  : "rgba(248,113,113,0.2)";
  return (
    <div className="msg-score" style={{ display:"flex", justifyContent:"center", padding:"2px 0" }}>
      <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:bg, border:`1px solid ${border}`, borderRadius:99, padding:"5px 14px 5px 8px" }}>
        <div style={{ width:26, height:26, borderRadius:"50%", background:`rgba(${isHigh?"16,185,129":isMid?"251,191,36":"248,113,113"},0.12)`, border:`1.5px solid ${color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color, fontVariantNumeric:"tabular-nums" }}>{score}</div>
        <span style={{ fontSize:12, fontWeight:500, color, letterSpacing:"-0.01em" }}>{isHigh ? "Strong argument" : isMid ? "Developing" : "Needs work"}</span>
      </div>
    </div>
  );
}

// ─── TYPING ───────────────────────────────────────────────────
function Typing() {
  return (
    <div className="msg-ai" style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
      <div style={{ width:28, height:28, borderRadius:8, background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:600, color:"#a78bfa", flexShrink:0 }}>AI</div>
      <div style={{ padding:"12px 16px", borderRadius:"4px 14px 14px 14px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", display:"flex", gap:4, alignItems:"center" }}>
        {[0, .2, .4].map((d, i) => <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"rgba(167,139,250,0.5)", animation:`dot 1.2s ${d}s ease infinite` }} />)}
      </div>
    </div>
  );
}

// ─── STAT ─────────────────────────────────────────────────────
function Stat({ val, label, accent }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
      <div style={{ fontSize:20, fontWeight:600, letterSpacing:"-0.03em", color:accent||"#e8e8f0", lineHeight:1, fontVariantNumeric:"tabular-nums" }}>{val}</div>
      <div style={{ fontSize:10, fontWeight:500, color:"rgba(255,255,255,0.25)", marginTop:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────
export default function DebateArena() {
  const [screen,         setScreen]         = useState("start");
  const [topic,          setTopic]          = useState("");
  const [style,          setStyle]          = useState("standard");
  const [stance,         setStance]         = useState("for");
  const [messages,       setMessages]       = useState([]);
  const [history,        setHistory]        = useState([]);
  const [scores,         setScores]         = useState([]);
  const [levelIdx,       setLevelIdx]       = useState(0);
  const [round,          setRound]          = useState(1);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [listening,      setListening]      = useState(false);
  const [speaking,       setSpeaking]       = useState(false);
  const [voiceEnabled,   setVoiceEnabled]   = useState(true);
  const [summary,        setSummary]        = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const recognitionRef = useRef(null);
  const endRef         = useRef(null);
  const level = LEVELS[levelIdx];
  const levelColor = { Easy:"#34d399", Medium:"#fbbf24", Hard:"#f87171", Expert:"#a78bfa" };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);
  useEffect(() => {
    if (scores.length >= 2) {
      const avg = scores.slice(-2).reduce((a,b)=>a+b,0)/2;
      if (avg >= 72 && levelIdx < 3) setLevelIdx(i=>i+1);
    }
  }, [scores, levelIdx]);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Please use Chrome for voice input."); return; }
    const r = new SR(); r.lang="en-US"; r.interimResults=true; r.continuous=true;
    r.onstart=()=>setListening(true);
    r.onresult=(e)=>setInput(Array.from(e.results).map(x=>x[0].transcript).join(" "));
    r.onend=()=>setListening(false);
    r.onerror=(e)=>{ if(e.error!=="no-speech") setListening(false); };
    recognitionRef.current=r; r.start();
  }, []);
  const stopListening = useCallback(() => { recognitionRef.current?.stop(); setListening(false); }, []);

  const speakText = useCallback((text) => {
    if (!voiceEnabled) return;
    const clean = text.replace(/Score:\s*\d+\/100\s*[—-]\s*.*/gi,"").trim();
    if (!clean) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean); u.lang="en-US"; u.rate=1.05;
    const v = window.speechSynthesis.getVoices().find(v=>v.name.includes("Google UK English Male")||v.name.includes("Daniel")); if(v) u.voice=v;
    u.onstart=()=>setSpeaking(true); u.onend=()=>setSpeaking(false); u.onerror=()=>setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [voiceEnabled]);
  const stopSpeaking = useCallback(()=>{ window.speechSynthesis.cancel(); setSpeaking(false); }, []);

  const addMsg = (role, text) => setMessages(p=>[...p,{role,text}]);

  async function startDebate() {
    if (!topic.trim()) return;
    setScreen("debate"); setMessages([]); setHistory([]); setScores([]);
    setLevelIdx(0); setRound(1); setLoading(true); setError(null);
    try {
      const sys = buildPrompt({topic,level:"Easy",style,round:1,stance});
      const reply = await callClaude(sys,[],"Make your opening argument. 2-3 sentences, bold and direct. No greeting.");
      addMsg("ai",reply); speakText(reply);
      setHistory([{role:"user",content:"Make your opening argument."},{role:"assistant",content:reply}]);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function sendArgument() {
    if (!input.trim()||loading) return;
    const txt=input.trim(); setInput(""); addMsg("user",txt); setLoading(true); setError(null);
    try {
      const sys=buildPrompt({topic,level,style,round,stance});
      const reply=await callClaude(sys,history,txt);
      setHistory(p=>[...p,{role:"user",content:txt},{role:"assistant",content:reply}]);
      const lines=reply.split("\n").filter(l=>l.trim());
      let gradeLine="", rebuttal=[];
      for(const l of lines){ if(l.match(/^Score:/i)||l.match(/^\d+\/100/)) gradeLine=l; else rebuttal.push(l); }
      const score=parseScore(reply);
      if(score!==null){ setScores(p=>[...p,score]); if(gradeLine) addMsg("grade",gradeLine); }
      if(rebuttal.length){ const t=rebuttal.join(" "); addMsg("ai",t); speakText(t); }
      setRound(r=>r+1);
    } catch(e){ setError(e.message); }
    finally { setLoading(false); }
  }

  async function triggerSummary(finalScores, finalMessages) {
    stopSpeaking(); setScreen("summary"); setSummaryLoading(true);
    const transcript=finalMessages.map(m=>`[${m.role==="ai"?"AI":m.role==="grade"?"SCORE":"YOU"}]: ${m.text}`).join("\n\n");
    const avg=Math.round(finalScores.reduce((a,b)=>a+b,0)/finalScores.length);
    const trend=finalScores[finalScores.length-1]>finalScores[0]?"improving":finalScores[finalScores.length-1]<finalScores[0]?"declining":"consistent";
    const prompt=`You are a world-class debate coach.\n\nTOPIC: "${topic}"\nUSER ARGUED: ${stance==="for"?"FOR":"AGAINST"}\nROUNDS: ${finalScores.length}\nSCORES: ${finalScores.join(", ")} (Avg: ${avg}/100, Trend: ${trend})\n\nTRANSCRIPT:\n${transcript}\n\nWrite a coaching debrief:\n## Overall Grade\nLetter grade (A/B/C/D/F) and one verdict sentence.\n## What You Did Well\n2 specific strengths with quotes.\n## Your Biggest Weakness\nName it clearly. Quote a line that shows it.\n## Two Drills\nDrill 1:\nDrill 2:\n## Next Challenge\nOne punchy line and next topic.\n\nBe direct, specific, honest.`;
    try {
      const API_URL=process.env.NODE_ENV==="production"?"/api/chat":"http://localhost:3001/api/chat";
      const res=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({systemPrompt:prompt,messages:[{role:"user",content:"Give my debrief."}]})});
      const data=await res.json(); if(data.error) throw new Error(data.error);
      setSummary(data.reply);
    } catch(e){ setSummary("Error generating summary: "+e.message); }
    finally { setSummaryLoading(false); }
  }

  const avgScore = scores.length>0 ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null;

  // ══ START ══════════════════════════════════════════════════
  if (screen==="start") return (
    <div style={{ minHeight:"100vh", position:"relative" }}>
      <style>{CSS}</style>
      <Bg/>
      <Nav showBack={false}/>
      <div style={{ maxWidth:600, margin:"0 auto", padding:"56px 24px 80px", position:"relative", zIndex:1 }}>

        {/* Hero */}
        <div className="fu" style={{ marginBottom:52 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:12, fontWeight:500, color:"rgba(167,139,250,0.8)", background:"rgba(124,58,237,0.08)", border:"1px solid rgba(124,58,237,0.18)", borderRadius:99, padding:"4px 12px", marginBottom:22, letterSpacing:"0.01em" }}>
            <div style={{ width:5, height:5, borderRadius:"50%", background:"#a78bfa", animation:"pulse 2s ease infinite" }}/>
            AI Debate Training · 2026
          </div>
          <h1 style={{ fontSize:42, fontWeight:600, letterSpacing:"-0.04em", lineHeight:1.08, color:"#f0f0f8", marginBottom:16 }}>
            Argue better.<br/>
            <span style={{ color:"transparent", background:"linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #c4b5fd 100%)", WebkitBackgroundClip:"text", backgroundClip:"text", backgroundSize:"200% 200%", animation:"gradMove 5s ease infinite" }}>Think sharper.</span>
          </h1>
          <p style={{ fontSize:15, color:"rgba(255,255,255,0.38)", lineHeight:1.7, maxWidth:420, fontWeight:400 }}>
            The AI takes the opposing side, escalates as you improve, and gives you a personal coach debrief after every session.
          </p>
        </div>

        {/* Style */}
        <div className="fu1" style={{ marginBottom:28 }}>
          <div className="label">Debate style</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
            {DEBATE_STYLES.map(s => (
              <button key={s.id} onClick={()=>setStyle(s.id)} style={{ padding:"14px 8px", borderRadius:12, border:`1px solid ${style===s.id?"rgba(124,58,237,0.5)":"rgba(255,255,255,0.07)"}`, background:style===s.id?"rgba(124,58,237,0.08)":"rgba(255,255,255,0.02)", display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer", transition:"all .18s", boxShadow:style===s.id?"0 0 0 1px rgba(124,58,237,0.15) inset":"none" }}>
                <span style={{ fontSize:18, lineHeight:1, filter:style===s.id?"drop-shadow(0 0 6px rgba(167,139,250,0.7))":"none", transition:"filter .2s" }}>{s.icon}</span>
                <span style={{ fontSize:12, fontWeight:600, color:style===s.id?"#c4b5fd":"rgba(255,255,255,0.4)", letterSpacing:"-0.01em" }}>{s.label}</span>
                <span style={{ fontSize:10, color:"rgba(255,255,255,0.2)", textAlign:"center", lineHeight:1.35 }}>{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stance */}
        <div className="fu2" style={{ marginBottom:28 }}>
          <div className="label">Your position</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              { val:"for",     emoji:"👍", label:"Argue For",    sub:"You support the motion",  color:"#34d399", rgb:"16,185,129" },
              { val:"against", emoji:"👎", label:"Argue Against", sub:"You oppose the motion",   color:"#f87171", rgb:"248,113,113" },
            ].map(s=>(
              <button key={s.val} onClick={()=>setStance(s.val)} style={{ padding:"18px 16px", borderRadius:14, border:`1px solid ${stance===s.val?`rgba(${s.rgb},0.35)`:"rgba(255,255,255,0.07)"}`, background:stance===s.val?`rgba(${s.rgb},0.06)`:"rgba(255,255,255,0.02)", textAlign:"left", cursor:"pointer", transition:"all .2s", boxShadow:stance===s.val?`0 0 0 1px rgba(${s.rgb},0.1) inset`:"none" }}>
                <div style={{ fontSize:24, marginBottom:8, filter:stance===s.val?`drop-shadow(0 0 8px rgba(${s.rgb},0.5))`:"none", transition:"filter .2s" }}>{s.emoji}</div>
                <div style={{ fontSize:13, fontWeight:600, color:stance===s.val?s.color:"rgba(255,255,255,0.5)", letterSpacing:"-0.01em", marginBottom:3 }}>{s.label}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.2)", fontWeight:400 }}>{s.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Topic */}
        <div className="fu3" style={{ marginBottom:16 }}>
          <div className="label">Topic</div>
          <div style={{ display:"flex", gap:8 }}>
            <input value={topic} onChange={e=>setTopic(e.target.value)} onKeyDown={e=>e.key==="Enter"&&startDebate()} placeholder="Enter any debate topic…" style={{ flex:1, fontSize:14 }}/>
            <button className="btn-cta" onClick={startDebate} style={{ flexShrink:0, whiteSpace:"nowrap" }}>Enter Arena →</button>
          </div>
        </div>

        <div className="fu4" style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {SAMPLE_TOPICS.map(t=>(
            <button key={t} className="chip" onClick={()=>setTopic(t)}>{t}</button>
          ))}
        </div>

        {/* Footer capabilities */}
        <div className="fu5" style={{ marginTop:48, paddingTop:24, borderTop:"1px solid rgba(255,255,255,0.05)", display:"flex", gap:16, flexWrap:"wrap" }}>
          {["🎙️ Voice input", "🔊 AI voice responses", "📈 Adaptive difficulty", "🏆 Coach debrief", "⚡ Real-time scoring"].map(f=>(
            <span key={f} style={{ fontSize:11, color:"rgba(255,255,255,0.22)", fontWeight:500 }}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );

  // ══ SUMMARY ════════════════════════════════════════════════
  if (screen==="summary") {
    const avg   = scores.length>0 ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
    const grade = avg>=85?"A":avg>=70?"B":avg>=55?"C":avg>=40?"D":"F";
    const gc    = avg>=85?"#34d399":avg>=70?"#a78bfa":avg>=55?"#fbbf24":"#f87171";
    const gcRgb = avg>=85?"16,185,129":avg>=70?"167,139,250":avg>=55?"251,191,36":"248,113,113";
    const sections = summary ? summary.split(/\n## /).map((s,i)=>i===0?s.replace(/^## /,""):s) : [];
    const sectionIcons = ["🏆","✅","⚠️","💪","🎯"];

    return (
      <div style={{ minHeight:"100vh", position:"relative" }}>
        <style>{CSS}</style>
        <Bg/>
        <Nav showBack onBack={()=>{ setScreen("start"); setSummary(null); setScores([]); setRound(1); setMessages([]); setHistory([]); setLevelIdx(0); }}/>
        <div style={{ maxWidth:620, margin:"0 auto", padding:"40px 24px 80px", position:"relative", zIndex:1 }}>

          {/* Header */}
          <div className="fu" style={{ marginBottom:32 }}>
            <div style={{ fontSize:11, fontWeight:500, color:"rgba(255,255,255,0.3)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>Session complete</div>
            <h1 style={{ fontSize:28, fontWeight:600, letterSpacing:"-0.03em", color:"#f0f0f8", lineHeight:1.2, marginBottom:6 }}>{topic}</h1>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.3)" }}>You argued {stance==="for"?"for":"against"} · {scores.length} rounds · {level} difficulty</p>
          </div>

          {/* Grade card */}
          <div className="fu1" style={{ display:"grid", gridTemplateColumns:"auto 1fr 1fr 1fr", gap:10, marginBottom:24 }}>
            <div style={{ background:`rgba(${gcRgb},0.07)`, border:`1px solid rgba(${gcRgb},0.2)`, borderRadius:14, padding:"20px 28px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minWidth:90 }}>
              <div style={{ fontSize:44, fontWeight:600, letterSpacing:"-0.04em", color:gc, lineHeight:1, textShadow:`0 0 32px rgba(${gcRgb},0.5)` }}>{grade}</div>
              <div style={{ fontSize:10, fontWeight:500, color:`rgba(${gcRgb},0.6)`, marginTop:5, textTransform:"uppercase", letterSpacing:"0.08em" }}>Grade</div>
            </div>
            <Stat val={`${avg}%`}       label="Avg Score"    accent={gc}/>
            <Stat val={scores.length}   label="Rounds"/>
            <Stat val={level}           label="Final Level"  accent={levelColor[level]}/>
          </div>

          {/* Score chart */}
          <div className="fu2 surface" style={{ padding:"18px 20px", marginBottom:20 }}>
            <div className="label">Performance</div>
            <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:72 }}>
              {scores.map((s,i)=>{
                const c=s>=70?"#34d399":s>=50?"#fbbf24":"#f87171";
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", fontVariantNumeric:"tabular-nums" }}>{s}</div>
                    <div style={{ width:"100%", borderRadius:"4px 4px 0 0", height:`${(s/100)*50}px`, minHeight:3, background:`linear-gradient(180deg,${c} 0%,${c}66 100%)`, boxShadow:s>=70?`0 0 8px rgba(16,185,129,0.35)`:"none", transition:"height .5s cubic-bezier(.16,1,.3,1)" }}/>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.2)" }}>R{i+1}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Debrief */}
          <div className="fu3 surface" style={{ marginBottom:24 }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:30, height:30, borderRadius:8, background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>🎓</div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:"#e8e8f0", letterSpacing:"-0.01em" }}>Coach Debrief</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.25)", marginTop:1 }}>Personalized analysis of your performance</div>
              </div>
            </div>
            <div style={{ padding:"20px" }}>
              {summaryLoading ? (
                <div style={{ display:"flex", alignItems:"center", gap:10, color:"rgba(255,255,255,0.25)", fontSize:13 }}>
                  {[0,.2,.4].map((d,i)=><div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"rgba(124,58,237,0.4)", animation:`dot 1.2s ${d}s ease infinite` }}/>)}
                  Analyzing your debate…
                </div>
              ) : sections.map((section, i) => {
                const lines = section.split("\n"); const heading=lines[0]; const body=lines.slice(1).join("\n").trim();
                return (
                  <div key={i} style={{ paddingBottom: i<sections.length-1?"18px":"0", marginBottom:i<sections.length-1?"18px":"0", borderBottom:i<sections.length-1?"1px solid rgba(255,255,255,0.05)":"none" }}>
                    {heading && (
                      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
                        <span style={{ fontSize:13 }}>{sectionIcons[i]||"•"}</span>
                        <div style={{ fontSize:10, fontWeight:600, color:"rgba(124,58,237,0.7)", textTransform:"uppercase", letterSpacing:"0.08em" }}>{heading}</div>
                      </div>
                    )}
                    <div style={{ fontSize:13.5, color:"rgba(255,255,255,0.55)", lineHeight:1.8, whiteSpace:"pre-wrap", fontWeight:400 }}>{body}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="fu4" style={{ display:"flex", gap:10 }}>
            <button className="btn-cta" style={{ flex:1, padding:"13px" }} onClick={()=>{ setScreen("start"); setSummary(null); setScores([]); setRound(1); setMessages([]); setHistory([]); setLevelIdx(0); }}>
              Debate again
            </button>
            <button className="btn-secondary" style={{ flex:1, padding:"13px" }} onClick={()=>{
              const avg2=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
              const txt=[`Debate Session — ${new Date().toLocaleDateString()}`,`Topic: ${topic}`,`Position: ${stance==="for"?"FOR":"AGAINST"}`,`Grade: ${grade} · Avg: ${avg2}% · Rounds: ${scores.length}`,"─".repeat(48),summary||""].join("\n");
              const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([txt],{type:"text/plain"})); a.download="debate-session.txt"; a.click();
            }}>
              Save report
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══ DEBATE ════════════════════════════════════════════════
  return (
    <div style={{ minHeight:"100vh", position:"relative" }}>
      <style>{CSS}</style>
      <Bg/>
      <Nav showBack onBack={()=>setScreen("start")}/>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"24px 24px 40px", position:"relative", zIndex:1 }}>

        {/* Stats row */}
        <div className="fu" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
          <Stat val={round}   label="Round"/>
          <Stat val={avgScore!==null?`${avgScore}%`:"—"} label="Avg Score" accent={avgScore!==null?(avgScore>=70?"#34d399":avgScore>=50?"#fbbf24":"#f87171"):undefined}/>
          <Stat val={level}   label="Level"  accent={levelColor[level]}/>
          <Stat val={scores.length} label="Arguments"/>
        </div>

        {/* Arena card */}
        <div className="fu1 surface" style={{ marginBottom:12 }}>

          {/* Arena header */}
          <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize:15, fontWeight:600, color:"#e8e8f0", letterSpacing:"-0.02em", lineHeight:1.4, marginBottom:10 }}>{topic}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[
                { label:`You: ${stance==="for"?"👍 For":"👎 Against"}`, color:stance==="for"?"#34d399":"#f87171", bg:stance==="for"?"rgba(16,185,129,0.08)":"rgba(248,113,113,0.08)", border:stance==="for"?"rgba(16,185,129,0.2)":"rgba(248,113,113,0.2)" },
                { label:`AI: ${stance==="for"?"👎 Against":"👍 For"}`,  color:"#a78bfa", bg:"rgba(124,58,237,0.08)", border:"rgba(124,58,237,0.2)" },
                { label:`Round ${round}`, color:"rgba(255,255,255,0.3)", bg:"rgba(255,255,255,0.03)", border:"rgba(255,255,255,0.08)" },
              ].map(p=>(
                <span key={p.label} style={{ fontSize:11, fontWeight:500, padding:"3px 10px", borderRadius:99, background:p.bg, color:p.color, border:`1px solid ${p.border}` }}>{p.label}</span>
              ))}
              {speaking && <span style={{ fontSize:11, fontWeight:500, padding:"3px 10px", borderRadius:99, background:"rgba(124,58,237,0.08)", color:"#a78bfa", border:"1px solid rgba(124,58,237,0.2)", animation:"pulse 1.5s ease infinite" }}>🔊 Speaking</span>}
            </div>
          </div>

          {/* Messages */}
          <div style={{ padding:"20px", minHeight:240, maxHeight:400, overflowY:"auto", display:"flex", flexDirection:"column", gap:12 }}>
            {messages.length===0&&!loading&&(
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.12)", fontSize:13 }}>Waiting for the debate to begin…</div>
            )}
            {messages.map((m,i)=>{
              const isUser=m.role==="user", isGrade=m.role==="grade";
              const score=isGrade?parseScore(m.text):null;
              if(isGrade&&score!==null) return <ScorePill key={i} score={score}/>;
              return (
                <div key={i} className={isUser?"msg-user":"msg-ai"} style={{ display:"flex", gap:8, alignItems:"flex-end", flexDirection:isUser?"row-reverse":"row" }}>
                  <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:600, background:isUser?"rgba(16,185,129,0.1)":"rgba(124,58,237,0.1)", color:isUser?"#6ee7b7":"#c4b5fd", border:`1px solid ${isUser?"rgba(16,185,129,0.15)":"rgba(124,58,237,0.15)"}` }}>
                    {isUser?"You":"AI"}
                  </div>
                  <div style={{ maxWidth:"78%", padding:"11px 15px", borderRadius:isUser?"14px 3px 14px 14px":"3px 14px 14px 14px", fontSize:13.5, lineHeight:1.7, color:isUser?"rgba(167,243,208,0.85)":"rgba(221,214,254,0.85)", background:isUser?"rgba(16,185,129,0.05)":"rgba(124,58,237,0.05)", border:`1px solid ${isUser?"rgba(16,185,129,0.1)":"rgba(124,58,237,0.1)"}`, fontWeight:400 }}>
                    {m.text}
                  </div>
                </div>
              );
            })}
            {loading&&<Typing/>}
            {error&&<div style={{ color:"#f87171", fontSize:12, textAlign:"center", padding:8 }}>Error: {error}</div>}
            <div ref={endRef}/>
          </div>

          {/* Score bars */}
          {scores.length>=3&&(
            <div style={{ padding:"0 20px 14px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ paddingTop:12, marginBottom:8 }}><span className="label">Score trend</span></div>
              <div style={{ display:"flex", gap:5, alignItems:"flex-end", height:60 }}>
                {scores.map((s,i)=>{
                  const c=s>=70?"#34d399":s>=50?"#fbbf24":"#f87171";
                  return (
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                      <div style={{ fontSize:8, color:"rgba(255,255,255,0.2)", fontVariantNumeric:"tabular-nums" }}>{s}</div>
                      <div style={{ width:"100%", borderRadius:"3px 3px 0 0", height:`${(s/100)*40}px`, minHeight:2, background:c, opacity:.8, boxShadow:s>=70?`0 0 6px rgba(16,185,129,0.3)`:"none" }}/>
                      <div style={{ fontSize:8, color:"rgba(255,255,255,0.15)" }}>R{i+1}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{ padding:"14px 20px", borderTop:"1px solid rgba(255,255,255,0.05)", background:"rgba(0,0,0,0.15)" }}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendArgument();}}} placeholder="Make your argument… (↵ to send, ⇧↵ for new line)" disabled={loading} rows={3} style={{ marginBottom:10 }}/>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {scores.length>=1&&(
                  <button className="btn-end" onClick={()=>triggerSummary(scores,messages)}>End & review</button>
                )}
                <button onClick={()=>{setVoiceEnabled(v=>!v);stopSpeaking();}} style={{ background:"none", border:"none", fontSize:13, color:voiceEnabled?"rgba(255,255,255,0.35)":"rgba(255,255,255,0.15)", cursor:"pointer", padding:"4px 6px", borderRadius:6, transition:"color .15s" }} title="Toggle AI voice">
                  {voiceEnabled?"🔊":"🔇"}
                </button>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {listening&&<span style={{ fontSize:11, color:"#f87171", fontWeight:600, animation:"pulse 1s ease infinite" }}>● REC</span>}
                <button onClick={listening?stopListening:startListening} disabled={loading} title={listening?"Stop recording":"Speak your argument"} style={{ width:38, height:38, borderRadius:10, border:`1px solid ${listening?"rgba(248,113,113,0.35)":"rgba(255,255,255,0.08)"}`, background:listening?"rgba(248,113,113,0.08)":"rgba(255,255,255,0.03)", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all .18s", boxShadow:listening?"0 0 16px rgba(248,113,113,0.15)":"none" }}>
                  {listening?"⏹":"🎙️"}
                </button>
                <button id="argue-btn" className="btn-cta" onClick={sendArgument} disabled={loading} style={{ opacity:loading?.65:1, padding:"10px 22px" }}>
                  {loading?"Thinking…":"Argue →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
