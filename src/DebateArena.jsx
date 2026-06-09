/**
 * ============================================================
 *  PERSON A — DebateArena.jsx  (Frontend)
 *  Your job: UI, timer, score chart, export, debate styles
 * ============================================================
 *
 *  HOW IT CONNECTS TO PERSON B:
 *  Import their prompt builder at the top:
 *    import { buildSystemPrompt, buildSummaryPrompt } from './promptEngine.js'
 *  Then replace the inline prompt strings with their functions.
 *  That's the only integration step needed.
 *
 *  YOUR TODO LIST (search "TODO_A" to find each spot):
 *  [A1] CountdownTimer component — 90s per round
 *  [A2] ScoreChart component — bar chart of per-round scores
 *  [A3] Export button — download full transcript as .txt
 *  [A4] Style selector — Socratic / Cross-exam / Oxford tabs
 *  [A5] Session summary panel — shown after round 5
 * ============================================================
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ─── CONSTANTS ───────────────────────────────────────────────
const LEVELS = ["Easy", "Medium", "Hard", "Expert"];
const LEVEL_COLORS = {
  Easy: "#27500A",
  Medium: "#633806",
  Hard: "#791F1F",
  Expert: "#3C3489",
};
const LEVEL_BG = {
  Easy: "#EAF3DE",
  Medium: "#FAEEDA",
  Hard: "#FCEBEB",
  Expert: "#EEEDFE",
};

const DEBATE_STYLES = [
  {
    id: "standard",
    label: "Standard",
    icon: "⚖️",
    desc: "Classic rebuttal format",
  },
  {
    id: "socratic",
    label: "Socratic",
    icon: "🏛️",
    desc: "AI probes with questions",
  },
  {
    id: "crossexam",
    label: "Cross-Exam",
    icon: "🔍",
    desc: "AI attacks weak points",
  },
  {
    id: "oxford",
    label: "Oxford",
    icon: "📜",
    desc: "Formal structured debate",
  },
];

const ROUND_LIMIT = 90; // seconds per round — TODO_A1: wire to CountdownTimer

const SAMPLE_TOPICS = [
  "AI will replace most jobs in 10 years",
  "Social media does more harm than good",
  "College education is no longer worth the cost",
  "Remote work is better than office work",
  "Smartphones have made us less happy",
  "Space exploration should be a top global priority",
];

// ─── HELPER: CALL CLAUDE API ─────────────────────────────────
async function callClaude(systemPrompt, conversationHistory, newUserMsg) {
  const messages = [
    ...conversationHistory,
    { role: "user", content: newUserMsg },
  ];

  const res = await fetch("http://localhost:3001/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, messages }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.reply;
}

// ─── HELPER: PARSE SCORE FROM AI REPLY ───────────────────────
function parseScore(text) {
  const m = text.match(/Score:\s*(\d+)/i) || text.match(/(\d+)\/100/);
  return m ? Math.min(100, Math.max(0, parseInt(m[1]))) : null;
}

// ─── INLINE SYSTEM PROMPT (temporary — replace with Person B's) ──
// TODO_A: Once Person B finishes promptEngine.js, replace these with:
//   import { buildSystemPrompt, buildSummaryPrompt } from './promptEngine.js'
//   and call buildSystemPrompt({ topic, level, style, round })

function tempBuildSystemPrompt({ topic, level, style, round, stance }) {
  const levelInstructions = {
    Easy: "Use 1–2 clear logical points. Be approachable.",
    Medium: "Use evidence and real-world examples. Be analytical.",
    Hard: "Expose logical fallacies. Be rigorous and precise.",
    Expert:
      "Challenge every assumption. Demand precision. Be relentless and expert-level.",
  };

  const styleInstructions = {
    standard: "Deliver direct rebuttals to the user's arguments.",
    socratic:
      "Respond primarily with probing Socratic questions that expose weaknesses in the user's reasoning.",
    crossexam:
      "Aggressively cross-examine the user — identify the weakest part of their argument and attack it specifically.",
    oxford:
      "Use formal Oxford-style debate structure: acknowledge the motion, present your opposition formally, then rebut.",
  };

  const userSide = stance === "for" ? "IN FAVOUR of" : "AGAINST";
  const aiSide = stance === "for" ? "AGAINST" : "IN FAVOUR of";

  return `You are a skilled debate opponent. The topic is: "${topic}".
The user is arguing ${userSide} this topic. You must argue ${aiSide} it — the opposite side.
Style: ${styleInstructions[style] || styleInstructions.standard}
Difficulty: ${levelInstructions[level] || levelInstructions.Easy}
Round: ${round}

After each user argument, respond in this exact format:
Score: [0-100]/100 — [one sentence of specific feedback on their argument quality]

[Then your rebuttal in 2-3 sentences on a new paragraph]

Be direct. No greetings. No filler.`;
}

// ─── TODO_A1: COUNTDOWN TIMER COMPONENT ──────────────────────
// Build this component and drop it into the arena header.
// Props: { seconds, onExpire, isActive }
// When timer hits 0, call onExpire() which should auto-submit
// the user's current input (or show a "time's up" message).
//
// Starter:
// function CountdownTimer({ seconds, onExpire, isActive }) {
//   const [remaining, setRemaining] = useState(seconds);
//   useEffect(() => {
//     if (!isActive) return;
//     if (remaining <= 0) { onExpire(); return; }
//     const t = setTimeout(() => setRemaining(r => r - 1), 1000);
//     return () => clearTimeout(t);
//   }, [remaining, isActive]);
//   const pct = (remaining / seconds) * 100;
//   const color = remaining < 20 ? '#E24B4A' : remaining < 45 ? '#EF9F27' : '#1D9E75';
//   return ( ... your timer UI ... );
// }

// ─── TODO_A2: SCORE CHART COMPONENT ──────────────────────────
// Show this after round 3+. Use recharts BarChart (already imported).
// Props: { scores }  — array of numbers 0–100
// Color each bar: green if ≥70, amber if ≥50, red if <50
//
// Starter:
// function ScoreChart({ scores }) {
//   const data = scores.map((s, i) => ({ round: `R${i+1}`, score: s }));
//   return (
//     <ResponsiveContainer width="100%" height={120}>
//       <BarChart data={data} barSize={24}>
//         <XAxis dataKey="round" tick={{ fontSize: 11 }} />
//         <YAxis domain={[0,100]} tick={{ fontSize: 11 }} />
//         <Tooltip />
//         <Bar dataKey="score" radius={[4,4,0,0]}>
//           {data.map((d,i) => <Cell key={i} fill={d.score>=70?'#1D9E75':d.score>=50?'#EF9F27':'#E24B4A'} />)}
//         </Bar>
//       </BarChart>
//     </ResponsiveContainer>
//   );
// }

// ─── TODO_A3: EXPORT FUNCTION ─────────────────────────────────
// Call this from an "Export Session" button.
// Format the transcript nicely as plain text.
//
// Starter:
// function exportSession(topic, messages, scores) {
//   const lines = [
//     `DEBATE SESSION — ${new Date().toLocaleDateString()}`,
//     `Topic: ${topic}`,
//     `Average Score: ${Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)}%`,
//     `Rounds: ${scores.length}`,
//     '─'.repeat(50),
//     ...messages.map(m => `[${m.role.toUpperCase()}]\n${m.text}\n`)
//   ];
//   const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement('a'); a.href=url; a.download='debate-session.txt'; a.click();
// }

// ─── MAIN APP COMPONENT ───────────────────────────────────────
export default function DebateArena() {
  const [screen, setScreen] = useState("start"); // 'start' | 'debate' | 'summary'
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("standard");
  const [stance, setStance] = useState("for"); // 'for' or 'against' — user's chosen side
  const [messages, setMessages] = useState([]); // { role: 'ai'|'user'|'grade', text }
  const [history, setHistory] = useState([]); // raw API conversation history
  const [scores, setScores] = useState([]);
  const [levelIdx, setLevelIdx] = useState(0);
  const [round, setRound] = useState(1);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [listening, setListening] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  const level = LEVELS[levelIdx];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-escalate difficulty based on rolling average
  useEffect(() => {
    if (scores.length >= 2) {
      const avg = scores.slice(-2).reduce((a, b) => a + b, 0) / 2;
      if (avg >= 72 && levelIdx < 3) setLevelIdx((i) => i + 1);
    }
  }, [scores]);

  // ── VOICE INPUT ─────────────────────────────────────────────
  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input not supported. Please use Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true; // keeps listening through pauses

    recognition.onstart = () => setListening(true);

    recognition.onresult = (e) => {
      // Collect all results so far into one transcript
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setInput(transcript);
    };

    recognition.onend = () => {
      // Only mark as done — do NOT auto-submit
      // User clicks Argue ↗ when ready
      setListening(false);
    };

    recognition.onerror = (e) => {
      if (e.error !== "no-speech") setListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  // ── AI VOICE OUTPUT ──────────────────────────────────────────
  function speakText(text) {
    if (!voiceEnabled) return;
    // Strip score line from speech — just speak the rebuttal
    const clean = text
      .replace(/Score:\s*\d+\/100\s*[—-]\s*.*/gi, "")
      .replace(/\d+\/100/g, "")
      .trim();
    if (!clean) return;

    window.speechSynthesis.cancel(); // stop any current speech
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "en-US";
    utterance.rate = 1.05;
    utterance.pitch = 1;

    // Pick a good voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Google UK English Male") ||
      v.name.includes("Daniel") ||
      v.name.includes("Alex") ||
      (v.lang === "en-US" && !v.name.includes("Google"))
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  // ── SESSION SUMMARY ──────────────────────────────────────────
  async function triggerSummary(finalScores, finalMessages) {
    stopSpeaking();
    setScreen("summary");
    setSummaryLoading(true);

    // Build transcript from messages
    const transcript = finalMessages
      .map((m) => {
        const role = m.role === "ai" ? "AI OPPONENT" : m.role === "grade" ? "SCORE" : "YOU";
        return `[${role}]: ${m.text}`;
      })
      .join("\n\n");

    const avg = Math.round(finalScores.reduce((a, b) => a + b, 0) / finalScores.length);
    const trend = finalScores[finalScores.length - 1] > finalScores[0] ? "improving" : 
                  finalScores[finalScores.length - 1] < finalScores[0] ? "declining" : "consistent";

    const summaryPrompt = `You are a world-class debate coach giving a post-session debrief.

TOPIC: "${topic}"
USER ARGUED: ${stance === "for" ? "FOR (in support)" : "AGAINST (in opposition)"}
ROUNDS: ${finalScores.length}
SCORES: ${finalScores.join(", ")} (Average: ${avg}/100, Trend: ${trend})

FULL DEBATE TRANSCRIPT:
${transcript}

Write a coaching debrief in this exact format (use these exact headings):

## Overall Grade
Give a letter grade (A/B/C/D/F) and one sentence verdict.

## What You Did Well
2 specific strengths — reference actual things they said in the debate.

## Your Biggest Weakness
Name the single most recurring problem. Quote a specific line from their debate that shows it.

## Two Drills For This Week
Drill 1: [specific daily practice]
Drill 2: [a debate technique to add]

## Debate Again?
One punchy motivating line. Tell them what topic to try next.

Be direct, specific, and honest. No fluff. Reference their actual arguments.`;

    try {
      const res = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: summaryPrompt,
          messages: [{ role: "user", content: "Give me my debate coaching debrief." }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSummary(data.reply);
    } catch (e) {
      setSummary("Could not generate summary: " + e.message);
    } finally {
      setSummaryLoading(false);
    }
  }

  const addMsg = (role, text) =>
    setMessages((prev) => [...prev, { role, text }]);

  const updateHistory = (userMsg, aiReply) =>
    setHistory((prev) => [
      ...prev,
      { role: "user", content: userMsg },
      { role: "assistant", content: aiReply },
    ]);

  async function startDebate() {
    if (!topic.trim()) return;
    setScreen("debate");
    setMessages([]);
    setHistory([]);
    setScores([]);
    setLevelIdx(0);
    setRound(1);
    setLoading(true);
    setError(null);

    try {
      const sys = tempBuildSystemPrompt({ topic, level: "Easy", style, round: 1, stance });
      // Opening: ask AI to make first argument
      const reply = await callClaude(sys, [], "Make your opening argument against this topic. Be concise — 2-3 sentences.");
      addMsg("ai", reply);
      speakText(reply);
      setHistory([
        { role: "user", content: "Make your opening argument against this topic. Be concise — 2-3 sentences." },
        { role: "assistant", content: reply },
      ]);
    } catch (e) {
      setError("API error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendArgument() {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    addMsg("user", userText);
    setLoading(true);
    setError(null);

    try {
      const sys = tempBuildSystemPrompt({ topic, level, style, round, stance });
      const reply = await callClaude(sys, history, userText);
      updateHistory(userText, reply);

      // Parse grade line vs rebuttal
      const lines = reply.split("\n").filter((l) => l.trim());
      let gradeLine = "";
      let rebuttalLines = [];
      for (const l of lines) {
        if (l.match(/^Score:/i) || l.match(/^\d+\/100/)) {
          gradeLine = l;
        } else {
          rebuttalLines.push(l);
        }
      }

      const score = parseScore(reply);
      if (score !== null) {
        setScores((prev) => [...prev, score]);
        if (gradeLine) addMsg("grade", gradeLine);
      }
      if (rebuttalLines.length) {
        const rebuttalText = rebuttalLines.join(" ");
        addMsg("ai", rebuttalText);
        speakText(rebuttalText);
      }

      const newRound = round + 1;
      setRound(newRound);

      // Summary triggered manually by user via "End Debate" button

    } catch (e) {
      setError("API error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  // ── RENDER: START SCREEN ────────────────────────────────────
  if (screen === "start") {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <span style={{ fontSize: 28 }}>⚖️</span>
          <div>
            <h1 style={styles.title}>Debate Arena</h1>
            <p style={styles.subtitle}>
              AI argues the opposite. You get sharper.
            </p>
          </div>
        </div>

        {/* TODO_A4: Style selector — render DEBATE_STYLES as clickable cards */}
        <div style={styles.section}>
          <div style={styles.label}>Debate style</div>
          <div style={styles.styleGrid}>
            {DEBATE_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                style={{
                  ...styles.styleCard,
                  ...(style === s.id ? styles.styleCardActive : {}),
                }}
              >
                <span style={{ fontSize: 18 }}>{s.icon}</span>
                <span style={styles.styleLabel}>{s.label}</span>
                <span style={styles.styleDesc}>{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SIDE SELECTOR */}
        <div style={styles.section}>
          <div style={styles.label}>You will argue</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setStance("for")}
              style={{
                flex: 1, padding: "12px", borderRadius: "var(--border-radius-md)",
                border: stance === "for" ? "2px solid #1D9E75" : "0.5px solid var(--color-border-tertiary)",
                background: stance === "for" ? "#EAF3DE" : "var(--color-background-secondary)",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: 22 }}>👍</div>
              <div style={{ fontWeight: 600, color: "#27500A", marginTop: 4 }}>FOR</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>You support the topic</div>
            </button>
            <button
              onClick={() => setStance("against")}
              style={{
                flex: 1, padding: "12px", borderRadius: "var(--border-radius-md)",
                border: stance === "against" ? "2px solid #E24B4A" : "0.5px solid var(--color-border-tertiary)",
                background: stance === "against" ? "#FCEBEB" : "var(--color-background-secondary)",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: 22 }}>👎</div>
              <div style={{ fontWeight: 600, color: "#791F1F", marginTop: 4 }}>AGAINST</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>You oppose the topic</div>
            </button>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.label}>Your topic</div>
          <div style={styles.topicRow}>
            <input
              style={styles.input}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startDebate()}
              placeholder="e.g. Social media does more harm than good"
            />
            <button style={styles.primaryBtn} onClick={startDebate}>
              Start debate ↗
            </button>
          </div>
          <div style={styles.chips}>
            {SAMPLE_TOPICS.map((t) => (
              <button
                key={t}
                style={styles.chip}
                onClick={() => setTopic(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: SUMMARY SCREEN ──────────────────────────────────
  if (screen === "summary") {
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const grade = avg >= 85 ? "A" : avg >= 70 ? "B" : avg >= 55 ? "C" : avg >= 40 ? "D" : "F";
    const gradeColor = avg >= 85 ? "#27500A" : avg >= 70 ? "#1D9E75" : avg >= 55 ? "#633806" : "#791F1F";
    const gradeBg = avg >= 85 ? "#EAF3DE" : avg >= 70 ? "#E1F5EE" : avg >= 55 ? "#FAEEDA" : "#FCEBEB";

    // Parse summary sections for nice rendering
    const sections = summary ? summary.split(/\n## /).map((s, i) => i === 0 ? s.replace("## ", "") : s) : [];

    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <span style={{ fontSize: 28 }}>⚖️</span>
          <div>
            <h1 style={styles.title}>Session Complete</h1>
            <p style={styles.subtitle}>{topic}</p>
          </div>
        </div>

        {/* Grade card */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: "1.5rem" }}>
          <div style={{ ...styles.statCard, gridColumn: "1", background: gradeBg }}>
            <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "'Playfair Display',serif", color: gradeColor }}>{grade}</div>
            <div style={styles.statLabel}>Grade</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statVal}>{avg}%</div>
            <div style={styles.statLabel}>Avg score</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statVal}>{scores.length}</div>
            <div style={styles.statLabel}>Rounds</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statVal, fontSize: 14, color: gradeColor }}>{LEVELS[levelIdx]}</div>
            <div style={styles.statLabel}>Final level</div>
          </div>
        </div>

        {/* Score trend */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={styles.label}>Your score per round</div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 60 }}>
            {scores.map((s, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{s}</div>
                <div style={{
                  width: "100%", borderRadius: "4px 4px 0 0",
                  height: `${(s / 100) * 44}px`,
                  background: s >= 70 ? "#1D9E75" : s >= 50 ? "#EF9F27" : "#E24B4A",
                  minHeight: 4,
                }} />
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>R{i + 1}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Coach debrief */}
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden", marginBottom: "1.5rem" }}>
          <div style={{ padding: "12px 16px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 16 }}>
            🎓 Coach Debrief
          </div>
          <div style={{ padding: "16px", fontSize: 14, lineHeight: 1.8, color: "var(--color-text-primary)" }}>
            {summaryLoading ? (
              <div style={{ color: "var(--color-text-secondary)", fontStyle: "italic" }}>
                Analyzing your debate… this takes a few seconds ⏳
              </div>
            ) : summary ? (
              sections.map((section, i) => {
                const lines = section.split("\n");
                const heading = lines[0];
                const body = lines.slice(1).join("\n").trim();
                return (
                  <div key={i} style={{ marginBottom: "1.25rem" }}>
                    {heading && <div style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em" }}>{heading}</div>}
                    <div style={{ color: "var(--color-text-secondary)", whiteSpace: "pre-wrap" }}>{body}</div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: "#E24B4A" }}>Could not load summary.</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...styles.primaryBtn, flex: 1 }} onClick={() => {
            setScreen("start");
            setSummary(null);
            setScores([]);
            setRound(1);
            setMessages([]);
            setHistory([]);
            setLevelIdx(0);
          }}>
            🔄 Debate Again
          </button>
          <button style={{ ...styles.ghostBtn, flex: 1, border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 16px", fontSize: 13 }}
            onClick={() => {
              const text = [
                `DEBATE SESSION — ${new Date().toLocaleDateString()}`,
                `Topic: ${topic}`,
                `Your side: ${stance === "for" ? "FOR" : "AGAINST"}`,
                `Grade: ${grade} | Avg Score: ${avg}% | Rounds: ${scores.length}`,
                `Scores: ${scores.join(", ")}`,
                "─".repeat(50),
                summary || ""
              ].join("\n");
              const blob = new Blob([text], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "debate-session.txt"; a.click();
            }}>
            💾 Save Report
          </button>
        </div>
      </div>
    );
  }

  // ── RENDER: DEBATE SCREEN ───────────────────────────────────
  return (
    <div style={styles.page}>
      {/* Stats bar */}
      <div style={styles.statsRow}>
        {[
          { label: "Round", val: round },
          {
            label: "Avg score",
            val: avgScore !== null ? `${avgScore}%` : "—",
          },
          {
            label: "Level",
            val: level,
            color: LEVEL_COLORS[level],
            bg: LEVEL_BG[level],
          },
          { label: "Args made", val: scores.length },
        ].map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div
              style={{
                ...styles.statVal,
                ...(s.color
                  ? {
                      color: s.color,
                      background: s.bg,
                      padding: "2px 8px",
                      borderRadius: 99,
                      fontSize: 12,
                    }
                  : {}),
              }}
            >
              {s.val}
            </div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Arena */}
      <div style={styles.arena}>
        <div style={styles.arenaHeader}>
          <div>
            <span style={styles.arenaTitle}>{topic}</span>
            <div style={{ fontSize: 11, marginTop: 3 }}>
              <span style={{ padding: "2px 8px", borderRadius: 99, fontWeight: 500,
                background: stance === "for" ? "#EAF3DE" : "#FCEBEB",
                color: stance === "for" ? "#27500A" : "#791F1F" }}>
                You: {stance === "for" ? "👍 FOR" : "👎 AGAINST"}
              </span>
              <span style={{ marginLeft: 6, padding: "2px 8px", borderRadius: 99, fontWeight: 500,
                background: "#EEEDFE", color: "#3C3489" }}>
                AI: {stance === "for" ? "👎 AGAINST" : "👍 FOR"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {speaking && (
              <span style={{ fontSize: 12, color: "#3C3489", fontStyle: "italic" }}>
                🔊 AI speaking…
              </span>
            )}
            {speaking && (
              <button
                onClick={stopSpeaking}
                style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, border: "1px solid #3C3489", background: "#EEEDFE", color: "#3C3489", cursor: "pointer" }}
              >
                Stop
              </button>
            )}
            <button
              onClick={() => { setVoiceEnabled(v => !v); stopSpeaking(); }}
              title={voiceEnabled ? "Turn off AI voice" : "Turn on AI voice"}
              style={{ fontSize: 16, background: "none", border: "none", cursor: "pointer", opacity: voiceEnabled ? 1 : 0.4 }}
            >
              🔊
            </button>
          </div>
        </div>

        <div style={styles.messages}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                ...styles.msgRow,
                flexDirection: m.role === "user" ? "row-reverse" : "row",
              }}
            >
              <div
                style={{
                  ...styles.avatar,
                  background:
                    m.role === "user"
                      ? "#E1F5EE"
                      : m.role === "grade"
                      ? "#FAEEDA"
                      : "#EEEDFE",
                  color:
                    m.role === "user"
                      ? "#085041"
                      : m.role === "grade"
                      ? "#633806"
                      : "#3C3489",
                }}
              >
                {m.role === "user" ? "You" : m.role === "grade" ? "📊" : "AI"}
              </div>
              <div
                style={{
                  ...styles.bubble,
                  background:
                    m.role === "user"
                      ? "#E1F5EE"
                      : m.role === "grade"
                      ? "#FAEEDA"
                      : "var(--color-background-secondary)",
                  color:
                    m.role === "user"
                      ? "#085041"
                      : m.role === "grade"
                      ? "#633806"
                      : "var(--color-text-primary)",
                  border:
                    m.role === "grade"
                      ? "0.5px solid #EF9F27"
                      : "0.5px solid var(--color-border-tertiary)",
                }}
              >
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ ...styles.msgRow, flexDirection: "row" }}>
              <div style={{ ...styles.avatar, background: "#EEEDFE", color: "#3C3489" }}>AI</div>
              <div style={{ ...styles.bubble, background: "var(--color-background-secondary)" }}>
                <span style={styles.typingDots}>thinking…</span>
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: "#E24B4A", fontSize: 13, padding: "8px 0" }}>
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* TODO_A2: Show ScoreChart here when scores.length >= 3 */}
        {scores.length >= 3 && (
          <div style={{ padding: "0 14px 8px" }}>
            <div style={styles.label}>Your score trend</div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart
                data={scores.map((s, i) => ({ r: `R${i + 1}`, s }))}
                barSize={20}
              >
                <XAxis dataKey="r" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  formatter={(v) => [`${v}%`, "Score"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="s" radius={[4, 4, 0, 0]}>
                  {scores.map((s, i) => (
                    <Cell
                      key={i}
                      fill={s >= 70 ? "#1D9E75" : s >= 50 ? "#EF9F27" : "#E24B4A"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div style={styles.inputArea}>
          <textarea
            style={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendArgument();
              }
            }}
            placeholder="Make your argument… (Enter to send, Shift+Enter for newline)"
            disabled={loading}
            rows={3}
          />
          <div style={styles.inputFooter}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{ ...styles.ghostBtn, fontSize: 12 }}
                onClick={() => setScreen("start")}
              >
                ← New topic
              </button>
              {scores.length >= 1 && (
                <button
                  style={{
                    fontSize: 12, padding: "6px 14px",
                    borderRadius: "var(--border-radius-md)",
                    border: "1.5px solid #1D9E75",
                    background: "#E1F5EE", color: "#085041",
                    cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                  }}
                  onClick={() => triggerSummary(scores, messages)}
                >
                  🏁 End & Get Review
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* MIC BUTTON */}
              <button
                onClick={listening ? stopListening : startListening}
                disabled={loading}
                title={listening ? "Click to stop recording, then click Argue ↗" : "Click to start speaking your argument"}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: listening ? "2px solid #E24B4A" : "1.5px solid var(--color-border-secondary)",
                  background: listening ? "#FCEBEB" : "var(--color-background-secondary)",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: listening ? "pulse 1s infinite" : "none",
                  flexShrink: 0,
                }}
              >
                {listening ? "⏹" : "🎙️"}
              </button>
              {listening && (
                <span style={{ fontSize: 12, color: "#E24B4A", fontStyle: "italic" }}>
                  🎙️ Listening… (click ⏹ when done, then Argue ↗)
                </span>
              )}
              <button
                id="argue-btn"
                style={{ ...styles.primaryBtn, opacity: loading ? 0.5 : 1 }}
                onClick={sendArgument}
                disabled={loading}
              >
                {loading ? "Thinking…" : "Argue ↗"}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% { box-shadow: 0 0 0 0 rgba(226,75,74,0.4); }
              50% { box-shadow: 0 0 0 6px rgba(226,75,74,0); }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────
const styles = {
  page: { fontFamily: "'DM Sans', sans-serif", maxWidth: 680, margin: "0 auto", padding: "1.5rem 0" },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 },
  subtitle: { fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" },
  section: { marginBottom: "1.25rem" },
  label: { fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" },
  topicRow: { display: "flex", gap: 8 },
  input: { flex: 1, fontFamily: "'DM Sans', sans-serif" },
  chips: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 },
  chip: { fontSize: 12, padding: "4px 10px", borderRadius: 99, border: "0.5px solid var(--color-border-secondary)", cursor: "pointer", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", fontFamily: "inherit" },
  styleGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  styleCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", cursor: "pointer", fontFamily: "inherit" },
  styleCardActive: { border: "2px solid #1D9E75", background: "var(--color-background-primary)" },
  styleLabel: { fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" },
  styleDesc: { fontSize: 11, color: "var(--color-text-secondary)", textAlign: "center" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: "1rem" },
  statCard: { background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "10px", textAlign: "center" },
  statVal: { fontSize: 20, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "var(--color-text-primary)" },
  statLabel: { fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 },
  arena: { border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" },
  arenaHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" },
  arenaTitle: { fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", flex: 1 },
  messages: { padding: 14, minHeight: 200, maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 },
  msgRow: { display: "flex", gap: 8, alignItems: "flex-start" },
  avatar: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, flexShrink: 0 },
  bubble: { fontSize: 14, lineHeight: 1.6, padding: "10px 12px", borderRadius: 10, maxWidth: "85%", color: "var(--color-text-primary)" },
  typingDots: { color: "var(--color-text-secondary)", fontSize: 13, fontStyle: "italic" },
  inputArea: { borderTop: "0.5px solid var(--color-border-tertiary)", padding: "10px 14px", background: "var(--color-background-primary)" },
  textarea: { width: "100%", fontFamily: "'DM Sans', sans-serif", fontSize: 14, resize: "none", marginBottom: 8 },
  inputFooter: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  primaryBtn: { padding: "8px 16px", background: "#1D9E75", color: "#fff", border: "none", borderRadius: "var(--border-radius-md)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500 },
  ghostBtn: { background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontFamily: "inherit", padding: 0 },
};
