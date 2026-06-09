import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ─── CONFIG ──────────────────────────────────────────────────
const LEVELS = ["Easy", "Medium", "Hard", "Expert"];
const DEBATE_STYLES = [
  { id: "standard",  label: "Standard",   icon: "⚖️",  desc: "Classic rebuttal" },
  { id: "socratic",  label: "Socratic",   icon: "🏛️",  desc: "Probe with questions" },
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

// ─── API ──────────────────────────────────────────────────────
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
  const lvl = { Easy:"Use 1–2 clear points. Be approachable.", Medium:"Use evidence and examples. Be analytical.", Hard:"Expose logical fallacies. Be rigorous.", Expert:"Challenge every assumption. Be relentless." };
  const sty = { standard:"Deliver direct rebuttals.", socratic:"Respond with probing Socratic questions.", crossexam:"Attack the weakest part of their argument specifically.", oxford:"Use formal Oxford-style structure: oppose the motion, present points, rebut formally." };
  const userSide = stance === "for" ? "IN FAVOUR of" : "AGAINST";
  const aiSide   = stance === "for" ? "AGAINST"      : "IN FAVOUR of";
  return `You are a skilled debate opponent. Topic: "${topic}". User argues ${userSide} — you argue ${aiSide}.\nStyle: ${sty[style]||sty.standard}\nDifficulty: ${lvl[level]||lvl.Easy}\nRound: ${round}\n\nFormat every response:\nScore: [0-100]/100 — [one sentence of specific feedback]\n\n[Your rebuttal in 2-3 sentences]\n\nBe direct. No greetings.`;
}

// ─── GLOBAL CSS ───────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{background:#07070E!important;min-height:100vh}
body{font-family:'Inter',sans-serif;color:#E8E8F0}
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#2A2A40;border-radius:99px}

@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideRight{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideLeft{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(139,92,246,0.3)}50%{box-shadow:0 0 40px rgba(139,92,246,0.6)}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}50%{box-shadow:0 0 0 8px rgba(239,68,68,0)}}
@keyframes ripple{0%{transform:scale(0);opacity:1}100%{transform:scale(4);opacity:0}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes scorePop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes orbit{from{transform:rotate(0deg) translateX(3px) rotate(0deg)}to{transform:rotate(360deg) translateX(3px) rotate(-360deg)}}

.fa{animation:fadeUp 0.5s ease forwards}
.fa1{animation:fadeUp 0.5s 0.1s ease both}
.fa2{animation:fadeUp 0.5s 0.2s ease both}
.fa3{animation:fadeUp 0.5s 0.3s ease both}
.fa4{animation:fadeUp 0.5s 0.4s ease both}
.fi{animation:fadeIn 0.4s ease forwards}
.msg-ai{animation:slideRight 0.35s ease forwards}
.msg-user{animation:slideLeft 0.35s ease forwards}
.msg-grade{animation:fadeUp 0.3s ease forwards}

input,textarea{background:#0F0F1C;border:1px solid #2A2A40;border-radius:12px;color:#E8E8F0;padding:12px 16px;font-family:'Inter',sans-serif;font-size:14px;width:100%;transition:border-color 0.2s,box-shadow 0.2s}
input:focus,textarea:focus{outline:none;border-color:#8B5CF6;box-shadow:0 0 0 3px rgba(139,92,246,0.15)}
input::placeholder,textarea::placeholder{color:#3D3D5C}
textarea{resize:none;line-height:1.6}
button{font-family:'Inter',sans-serif;cursor:pointer;transition:all 0.2s}
button:active{transform:scale(0.97)}

.btn-primary{background:linear-gradient(135deg,#7C3AED,#A855F7);color:#fff;border:none;border-radius:12px;padding:12px 24px;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(139,92,246,0.4);position:relative;overflow:hidden}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 28px rgba(139,92,246,0.5)}
.btn-primary::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.1),transparent);pointer-events:none}

.btn-ghost{background:none;border:1px solid #2A2A40;border-radius:10px;color:#6B6B8A;padding:10px 16px;font-size:13px}
.btn-ghost:hover{border-color:#4A4A6A;color:#A0A0C0;background:rgba(255,255,255,0.02)}

.card{background:#0F0F1C;border:1px solid #1E1E30;border-radius:16px;position:relative;overflow:hidden}
.card::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,0.02) 0%,transparent 100%);pointer-events:none}

.glow-purple{animation:glow 3s ease infinite}
.float{animation:float 4s ease infinite}

.chip{background:#0F0F1C;border:1px solid #1E1E30;border-radius:99px;padding:6px 14px;font-size:12px;color:#6B6B8A;cursor:pointer;transition:all 0.15s;white-space:nowrap}
.chip:hover{border-color:#8B5CF6;color:#C4B5FD;background:rgba(139,92,246,0.08)}

.score-badge{animation:scorePop 0.4s ease forwards}
`;

// ─── COMPONENTS ───────────────────────────────────────────────

function ParticleField() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {[...Array(12)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 2, height: 2,
          borderRadius: "50%",
          background: i % 3 === 0 ? "#8B5CF6" : i % 3 === 1 ? "#22D3EE" : "#A855F7",
          left: `${(i * 8.3) % 100}%`,
          top: `${(i * 13.7) % 100}%`,
          opacity: 0.3,
          animation: `float ${3 + (i % 3)}s ${i * 0.4}s ease infinite`,
        }} />
      ))}
      {/* Ambient glow orbs */}
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", top: -100, right: -100 }} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.04) 0%, transparent 70%)", bottom: 100, left: -50 }} />
    </div>
  );
}

function StatCard({ val, label, accent }) {
  return (
    <div className="card" style={{ padding: "14px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: accent || "#E8E8F0", lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 10, color: "#4A4A6A", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function ScoreMeter({ score }) {
  const color = score >= 70 ? "#22D3A0" : score >= 50 ? "#FBBF24" : "#F87171";
  return (
    <div className="score-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 99, padding: "4px 12px" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{score}/100</span>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function DebateArena() {
  const [screen, setScreen]               = useState("start");
  const [topic, setTopic]                 = useState("");
  const [style, setStyle]                 = useState("standard");
  const [stance, setStance]               = useState("for");
  const [messages, setMessages]           = useState([]);
  const [history, setHistory]             = useState([]);
  const [scores, setScores]               = useState([]);
  const [levelIdx, setLevelIdx]           = useState(0);
  const [round, setRound]                 = useState(1);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [listening, setListening]         = useState(false);
  const [speaking, setSpeaking]           = useState(false);
  const [voiceEnabled, setVoiceEnabled]   = useState(true);
  const [summary, setSummary]             = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const level = LEVELS[levelIdx];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (scores.length >= 2) {
      const avg = scores.slice(-2).reduce((a,b) => a+b, 0) / 2;
      if (avg >= 72 && levelIdx < 3) setLevelIdx(i => i+1);
    }
  }, [scores, levelIdx]);

  // Voice in
  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome for voice input."); return; }
    const r = new SR();
    r.lang = "en-US"; r.interimResults = true; r.continuous = true;
    r.onstart = () => setListening(true);
    r.onresult = (e) => setInput(Array.from(e.results).map(x => x[0].transcript).join(" "));
    r.onend = () => setListening(false);
    r.onerror = (e) => { if (e.error !== "no-speech") setListening(false); };
    recognitionRef.current = r;
    r.start();
  }
  function stopListening() { recognitionRef.current?.stop(); setListening(false); }

  // Voice out
  function speakText(text) {
    if (!voiceEnabled) return;
    const clean = text.replace(/Score:\s*\d+\/100\s*[—-]\s*.*/gi, "").trim();
    if (!clean) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "en-US"; u.rate = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.name.includes("Google UK English Male") || v.name.includes("Daniel"));
    if (v) u.voice = v;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }
  function stopSpeaking() { window.speechSynthesis.cancel(); setSpeaking(false); }

  const addMsg = (role, text) => setMessages(p => [...p, { role, text }]);
  const updateHistory = (u, a) => setHistory(p => [...p, { role:"user", content:u }, { role:"assistant", content:a }]);

  async function startDebate() {
    if (!topic.trim()) return;
    setScreen("debate"); setMessages([]); setHistory([]); setScores([]);
    setLevelIdx(0); setRound(1); setLoading(true); setError(null);
    try {
      const sys = buildPrompt({ topic, level:"Easy", style, round:1, stance });
      const reply = await callClaude(sys, [], "Make your opening argument. 2-3 sentences, bold and direct.");
      addMsg("ai", reply); speakText(reply);
      setHistory([{ role:"user", content:"Make your opening argument." }, { role:"assistant", content:reply }]);
    } catch(e) { setError("API error: " + e.message); }
    finally { setLoading(false); }
  }

  async function sendArgument() {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput(""); addMsg("user", userText); setLoading(true); setError(null);
    try {
      const sys = buildPrompt({ topic, level, style, round, stance });
      const reply = await callClaude(sys, history, userText);
      updateHistory(userText, reply);
      const lines = reply.split("\n").filter(l => l.trim());
      let gradeLine = "", rebuttalLines = [];
      for (const l of lines) {
        if (l.match(/^Score:/i) || l.match(/^\d+\/100/)) gradeLine = l;
        else rebuttalLines.push(l);
      }
      const score = parseScore(reply);
      if (score !== null) { setScores(p => [...p, score]); if (gradeLine) addMsg("grade", gradeLine); }
      if (rebuttalLines.length) { const t = rebuttalLines.join(" "); addMsg("ai", t); speakText(t); }
      setRound(r => r+1);
    } catch(e) { setError("API error: " + e.message); }
    finally { setLoading(false); }
  }

  async function triggerSummary(finalScores, finalMessages) {
    stopSpeaking(); setScreen("summary"); setSummaryLoading(true);
    const transcript = finalMessages.map(m => {
      const r = m.role === "ai" ? "AI" : m.role === "grade" ? "SCORE" : "YOU";
      return `[${r}]: ${m.text}`;
    }).join("\n\n");
    const avg = Math.round(finalScores.reduce((a,b) => a+b, 0) / finalScores.length);
    const trend = finalScores[finalScores.length-1] > finalScores[0] ? "improving" : finalScores[finalScores.length-1] < finalScores[0] ? "declining" : "consistent";
    const prompt = `You are a world-class debate coach.\n\nTOPIC: "${topic}"\nUSER ARGUED: ${stance==="for"?"FOR":"AGAINST"}\nROUNDS: ${finalScores.length}\nSCORES: ${finalScores.join(", ")} (Avg: ${avg}/100, Trend: ${trend})\n\nTRANSCRIPT:\n${transcript}\n\nDebrief format:\n## Overall Grade\nLetter grade + one verdict sentence.\n## What You Did Well\n2 specific strengths with quotes.\n## Your Biggest Weakness\nName it. Quote a line showing it.\n## Two Drills For This Week\nDrill 1: [practice]\nDrill 2: [technique]\n## Debate Again?\nOne punchy line + suggested next topic.\n\nBe direct and specific.`;
    try {
      const API_URL = process.env.NODE_ENV === "production" ? "/api/chat" : "http://localhost:3001/api/chat";
      const res = await fetch(API_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ systemPrompt:prompt, messages:[{role:"user",content:"Give my debrief."}] }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSummary(data.reply);
    } catch(e) { setSummary("Error: " + e.message); }
    finally { setSummaryLoading(false); }
  }

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : null;
  const levelColors = { Easy:"#22D3A0", Medium:"#FBBF24", Hard:"#F87171", Expert:"#A855F7" };

  // ── START SCREEN ─────────────────────────────────────────────
  if (screen === "start") return (
    <div style={{ fontFamily:"'Inter',sans-serif", maxWidth:700, margin:"0 auto", padding:"2.5rem 1.5rem", position:"relative", zIndex:1, minHeight:"100vh" }}>
      <style>{CSS}</style>
      <ParticleField />

      {/* Header */}
      <div className="fa" style={{ display:"flex", alignItems:"center", gap:16, marginBottom:"2.5rem" }}>
        <div className="float glow-purple" style={{ width:52, height:52, borderRadius:16, background:"linear-gradient(135deg,#6D28D9,#A855F7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>
          ⚖️
        </div>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, background:"linear-gradient(90deg,#F0F0FF 30%,#A855F7 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", lineHeight:1.1 }}>
            Debate Arena
          </h1>
          <p style={{ fontSize:13, color:"#4A4A6A", marginTop:4 }}>AI argues the opposite. You get sharper.</p>
        </div>
      </div>

      {/* Debate style */}
      <div className="fa1" style={{ marginBottom:"1.75rem" }}>
        <div style={{ fontSize:10, fontWeight:600, color:"#4A4A6A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>Debate Style</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          {DEBATE_STYLES.map(s => (
            <button key={s.id} onClick={() => setStyle(s.id)} style={{
              display:"flex", flexDirection:"column", alignItems:"center", gap:6,
              padding:"14px 8px", borderRadius:14, border:`1.5px solid ${style===s.id?"#8B5CF6":"#1E1E30"}`,
              background: style===s.id ? "rgba(139,92,246,0.1)" : "#0F0F1C",
              boxShadow: style===s.id ? "0 0 20px rgba(139,92,246,0.2)" : "none",
              transition:"all 0.2s", cursor:"pointer",
            }}>
              <span style={{ fontSize:20 }}>{s.icon}</span>
              <span style={{ fontSize:12, fontWeight:600, color: style===s.id?"#C4B5FD":"#8888A8" }}>{s.label}</span>
              <span style={{ fontSize:10, color:"#3D3D5C", textAlign:"center", lineHeight:1.3 }}>{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stance */}
      <div className="fa2" style={{ marginBottom:"1.75rem" }}>
        <div style={{ fontSize:10, fontWeight:600, color:"#4A4A6A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>You will argue</div>
        <div style={{ display:"flex", gap:12 }}>
          {[
            { val:"for",     icon:"👍", label:"FOR",     color:"#22D3A0", dim:"rgba(34,211,160," },
            { val:"against", icon:"👎", label:"AGAINST",  color:"#F87171", dim:"rgba(248,113,113," },
          ].map(s => (
            <button key={s.val} onClick={() => setStance(s.val)} style={{
              flex:1, padding:"18px 12px", borderRadius:16, textAlign:"center",
              border:`1.5px solid ${stance===s.val ? s.color+"60" : "#1E1E30"}`,
              background: stance===s.val ? s.dim+"0.08)" : "#0F0F1C",
              boxShadow: stance===s.val ? `0 0 24px ${s.dim}0.15)}` : "none",
              transition:"all 0.25s", cursor:"pointer",
            }}>
              <div style={{ fontSize:28, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color: stance===s.val?s.color:"#4A4A6A" }}>{s.label}</div>
              <div style={{ fontSize:11, color:"#3D3D5C", marginTop:3 }}>You {s.val === "for" ? "support" : "oppose"} the topic</div>
            </button>
          ))}
        </div>
      </div>

      {/* Topic */}
      <div className="fa3" style={{ marginBottom:"1.75rem" }}>
        <div style={{ fontSize:10, fontWeight:600, color:"#4A4A6A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>Your Topic</div>
        <div style={{ display:"flex", gap:10 }}>
          <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key==="Enter" && startDebate()} placeholder="e.g. Social media does more harm than good" style={{ flex:1 }} />
          <button className="btn-primary" onClick={startDebate} style={{ whiteSpace:"nowrap", flexShrink:0 }}>
            Start ↗
          </button>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:10 }}>
          {SAMPLE_TOPICS.map(t => (
            <button key={t} className="chip" onClick={() => setTopic(t)}>{t}</button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── SUMMARY SCREEN ────────────────────────────────────────────
  if (screen === "summary") {
    const avg = scores.length > 0 ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 0;
    const grade = avg>=85?"A":avg>=70?"B":avg>=55?"C":avg>=40?"D":"F";
    const gc = avg>=85?"#22D3A0":avg>=70?"#A855F7":avg>=55?"#FBBF24":"#F87171";
    const sections = summary ? summary.split(/\n## /).map((s,i) => i===0?s.replace("## ",""):s) : [];

    return (
      <div style={{ fontFamily:"'Inter',sans-serif", maxWidth:700, margin:"0 auto", padding:"2.5rem 1.5rem", position:"relative", zIndex:1 }}>
        <style>{CSS}</style>
        <ParticleField />

        <div className="fa" style={{ display:"flex", alignItems:"center", gap:16, marginBottom:"2rem" }}>
          <div style={{ width:52, height:52, borderRadius:16, background:"linear-gradient(135deg,#6D28D9,#A855F7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>🏁</div>
          <div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:"#F0F0FF" }}>Session Complete</h1>
            <p style={{ fontSize:13, color:"#4A4A6A", marginTop:3 }}>{topic}</p>
          </div>
        </div>

        {/* Grade + stats */}
        <div className="fa1" style={{ display:"grid", gridTemplateColumns:"auto 1fr 1fr 1fr", gap:10, marginBottom:"1.5rem" }}>
          <div className="card" style={{ padding:"16px 20px", textAlign:"center", background:`${gc}12`, border:`1px solid ${gc}30` }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:48, fontWeight:800, color:gc, textShadow:`0 0 30px ${gc}`, lineHeight:1 }}>{grade}</div>
            <div style={{ fontSize:10, color:gc+"99", marginTop:4, textTransform:"uppercase", letterSpacing:"0.1em" }}>Grade</div>
          </div>
          <StatCard val={`${avg}%`} label="Avg Score" accent={gc} />
          <StatCard val={scores.length} label="Rounds" />
          <StatCard val={LEVELS[levelIdx]} label="Final Level" accent={levelColors[LEVELS[levelIdx]]} />
        </div>

        {/* Score bars */}
        <div className="card fa2" style={{ padding:"16px", marginBottom:"1.5rem" }}>
          <div style={{ fontSize:10, fontWeight:600, color:"#4A4A6A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>Performance Per Round</div>
          <div style={{ display:"flex", gap:8, alignItems:"flex-end", height:70 }}>
            {scores.map((s,i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ fontSize:10, color:"#4A4A6A" }}>{s}</div>
                <div style={{ width:"100%", borderRadius:"4px 4px 0 0", height:`${(s/100)*50}px`, minHeight:4, background:s>=70?"#22D3A0":s>=50?"#FBBF24":"#F87171", boxShadow:s>=70?"0 0 10px rgba(34,211,160,0.4)":"none", transition:"height 0.5s ease" }} />
                <div style={{ fontSize:10, color:"#3D3D5C" }}>R{i+1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Coach debrief */}
        <div className="card fa3" style={{ marginBottom:"1.5rem" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #1E1E30", display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>🎓</span>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:"#F0F0FF" }}>Coach Debrief</span>
          </div>
          <div style={{ padding:"20px" }}>
            {summaryLoading ? (
              <div style={{ color:"#3D3D5C", fontStyle:"italic", display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#8B5CF6", animation:"float 1s ease infinite" }} />
                Analyzing your debate…
              </div>
            ) : sections.map((section, i) => {
              const lines = section.split("\n");
              const heading = lines[0];
              const body = lines.slice(1).join("\n").trim();
              return (
                <div key={i} style={{ marginBottom:"1.25rem" }}>
                  {heading && <div style={{ fontSize:10, fontWeight:700, color:"#8B5CF6", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:3, height:14, background:"linear-gradient(#7C3AED,#A855F7)", borderRadius:99 }} />
                    {heading}
                  </div>}
                  <div style={{ fontSize:14, color:"#C0C0D8", lineHeight:1.8, whiteSpace:"pre-wrap" }}>{body}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="fa4" style={{ display:"flex", gap:10 }}>
          <button className="btn-primary" style={{ flex:1 }} onClick={() => { setScreen("start"); setSummary(null); setScores([]); setRound(1); setMessages([]); setHistory([]); setLevelIdx(0); }}>
            🔄 Debate Again
          </button>
          <button className="btn-ghost" style={{ flex:1 }} onClick={() => {
            const avg2 = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
            const text = [`DEBATE SESSION — ${new Date().toLocaleDateString()}`, `Topic: ${topic}`, `Side: ${stance==="for"?"FOR":"AGAINST"}`, `Grade: ${grade} | Avg: ${avg2}% | Rounds: ${scores.length}`, "─".repeat(50), summary||""].join("\n");
            const a = document.createElement("a"); a.href=URL.createObjectURL(new Blob([text],{type:"text/plain"})); a.download="debate-session.txt"; a.click();
          }}>
            💾 Save Report
          </button>
        </div>
      </div>
    );
  }

  // ── DEBATE SCREEN ─────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Inter',sans-serif", maxWidth:700, margin:"0 auto", padding:"2rem 1.5rem", position:"relative", zIndex:1, minHeight:"100vh" }}>
      <style>{CSS}</style>
      <ParticleField />

      {/* Stats */}
      <div className="fa" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:"1.25rem" }}>
        <StatCard val={round} label="Round" />
        <StatCard val={avgScore !== null ? `${avgScore}%` : "—"} label="Avg Score" accent={avgScore >= 70 ? "#22D3A0" : avgScore >= 50 ? "#FBBF24" : "#F87171"} />
        <StatCard val={level} label="Level" accent={levelColors[level]} />
        <StatCard val={scores.length} label="Args Made" />
      </div>

      {/* Arena */}
      <div className="card fa1" style={{ marginBottom:"1rem" }}>

        {/* Arena header */}
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #1E1E30", background:"linear-gradient(180deg,#13132A 0%,#0F0F1C 100%)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ flex:1, marginRight:12 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:"#F0F0FF", lineHeight:1.4 }}>{topic}</div>
              <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:99, background: stance==="for"?"rgba(34,211,160,0.1)":"rgba(248,113,113,0.1)", color:stance==="for"?"#22D3A0":"#F87171", border:`1px solid ${stance==="for"?"rgba(34,211,160,0.25)":"rgba(248,113,113,0.25)"}` }}>
                  You {stance==="for"?"👍 FOR":"👎 AGAINST"}
                </span>
                <span style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:99, background:"rgba(168,85,247,0.1)", color:"#C084FC", border:"1px solid rgba(168,85,247,0.25)" }}>
                  AI {stance==="for"?"👎 AGAINST":"👍 FOR"}
                </span>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {speaking && <span style={{ fontSize:11, color:"#8B5CF6", animation:"float 1s ease infinite" }}>🔊</span>}
              <button onClick={() => { setVoiceEnabled(v => !v); stopSpeaking(); }} style={{ background:"none", border:"none", fontSize:16, cursor:"pointer", opacity:voiceEnabled?1:0.3, padding:4 }} title="Toggle AI voice">
                🔊
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ padding:"20px 18px", minHeight:240, maxHeight:380, overflowY:"auto", display:"flex", flexDirection:"column", gap:16 }}>
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            const isGrade = m.role === "grade";
            const score = isGrade ? parseScore(m.text) : null;

            if (isGrade && score !== null) return (
              <div key={i} className="msg-grade" style={{ display:"flex", justifyContent:"center" }}>
                <ScoreMeter score={score} />
              </div>
            );

            return (
              <div key={i} className={isUser?"msg-user":"msg-ai"} style={{ display:"flex", gap:10, alignItems:"flex-start", flexDirection:isUser?"row-reverse":"row" }}>
                <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, background:isUser?"rgba(34,211,160,0.15)":"rgba(168,85,247,0.15)", color:isUser?"#22D3A0":"#C084FC", border:`1px solid ${isUser?"rgba(34,211,160,0.2)":"rgba(168,85,247,0.2)"}` }}>
                  {isUser?"You":"AI"}
                </div>
                <div style={{ maxWidth:"80%", padding:"12px 16px", borderRadius:isUser?"16px 4px 16px 16px":"4px 16px 16px 16px", fontSize:14, lineHeight:1.75, background:isUser?"rgba(34,211,160,0.07)":"rgba(168,85,247,0.07)", color:isUser?"#A7F3D0":"#DDD6FE", border:`1px solid ${isUser?"rgba(34,211,160,0.15)":"rgba(168,85,247,0.15)"}` }}>
                  {m.text}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="msg-ai" style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
              <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, background:"rgba(168,85,247,0.15)", color:"#C084FC", border:"1px solid rgba(168,85,247,0.2)" }}>AI</div>
              <div style={{ padding:"14px 18px", borderRadius:"4px 16px 16px 16px", background:"rgba(168,85,247,0.07)", border:"1px solid rgba(168,85,247,0.15)", display:"flex", gap:5, alignItems:"center" }}>
                {[0,1,2].map(j => <div key={j} style={{ width:6, height:6, borderRadius:"50%", background:"#8B5CF6", animation:`float 1.2s ${j*0.2}s ease infinite` }} />)}
              </div>
            </div>
          )}

          {error && <div style={{ color:"#F87171", fontSize:13, textAlign:"center" }}>{error}</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Score trend */}
        {scores.length >= 3 && (
          <div style={{ padding:"0 18px 14px", borderTop:"1px solid #1E1E30" }}>
            <div style={{ fontSize:10, fontWeight:600, color:"#3D3D5C", textTransform:"uppercase", letterSpacing:"0.1em", padding:"12px 0 8px" }}>Score Trend</div>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={scores.map((s,i) => ({r:`R${i+1}`,s}))} barSize={18}>
                <XAxis dataKey="r" tick={{fontSize:10, fill:"#3D3D5C"}} axisLine={false} tickLine={false} />
                <YAxis domain={[0,100]} hide />
                <Tooltip formatter={v=>[`${v}%`,"Score"]} contentStyle={{background:"#13131A",border:"1px solid #2A2A40",borderRadius:8,fontSize:12,color:"#E8E8F0"}} />
                <Bar dataKey="s" radius={[4,4,0,0]}>
                  {scores.map((s,i) => <Cell key={i} fill={s>=70?"#22D3A0":s>=50?"#FBBF24":"#F87171"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Input */}
        <div style={{ padding:"14px 18px", borderTop:"1px solid #1E1E30", background:"#0A0A16" }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendArgument(); } }} placeholder="Make your argument… (Enter to send)" disabled={loading} rows={3} />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button className="btn-ghost" style={{ fontSize:12, padding:"8px 12px" }} onClick={() => setScreen("start")}>← New topic</button>
              {scores.length >= 1 && (
                <button onClick={() => triggerSummary(scores, messages)} style={{ fontSize:12, padding:"8px 14px", borderRadius:10, border:"1px solid rgba(34,211,160,0.3)", background:"rgba(34,211,160,0.06)", color:"#22D3A0", cursor:"pointer", fontWeight:600 }}>
                  🏁 End & Review
                </button>
              )}
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {listening && <span style={{ fontSize:11, color:"#F87171", animation:"float 1s ease infinite" }}>🎙️ Listening…</span>}
              <button onClick={listening?stopListening:startListening} disabled={loading} style={{ width:40, height:40, borderRadius:12, border:`1.5px solid ${listening?"#F87171":"#2A2A40"}`, background:listening?"rgba(248,113,113,0.1)":"#0F0F1C", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", animation:listening?"pulse 1.5s infinite":"none", cursor:"pointer" }}>
                {listening?"⏹":"🎙️"}
              </button>
              <button id="argue-btn" className="btn-primary" onClick={sendArgument} disabled={loading} style={{ opacity:loading?0.6:1, padding:"10px 20px" }}>
                {loading?"⚡ Thinking…":"Argue ↗"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
