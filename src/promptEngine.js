/**
 * ============================================================
 *  PERSON B — promptEngine.js  (AI Logic)
 *  Your job: system prompts, grading rubric, debate styles,
 *            difficulty escalation, session summary
 * ============================================================
 *
 *  HOW IT CONNECTS TO PERSON A:
 *  They import your two main functions:
 *    import { buildSystemPrompt, buildSummaryPrompt } from './promptEngine.js'
 *  And call them like:
 *    buildSystemPrompt({ topic, level, style, round })
 *    buildSummaryPrompt({ topic, scores, transcript })
 *
 *  YOUR TODO LIST (search "TODO_B" to find each spot):
 *  [B1] Tune LEVEL_INSTRUCTIONS — make difficulty feel real
 *  [B2] Tune STYLE_INSTRUCTIONS — each style must feel distinct
 *  [B3] Tune GRADING_RUBRIC — 4 categories, 25pts each
 *  [B4] Build buildSummaryPrompt() — the 5-round coach summary
 *  [B5] Tune OPENING_PROMPT — first AI argument should hook the user
 * ============================================================
 */

// ─── DIFFICULTY LEVELS ────────────────────────────────────────
// TODO_B1: Make these feel genuinely different.
// Easy should feel like a smart friend pushing back.
// Expert should feel like a seasoned debater who finds every hole.
const LEVEL_INSTRUCTIONS = {
  Easy: `
    Use 1-2 clear, logical points. Keep language accessible.
    Avoid jargon. Be confident but not aggressive.
    If the user makes a good point, acknowledge it briefly before rebutting.
  `,

  Medium: `
    Use 2-3 arguments backed by real-world examples or statistics.
    Start identifying logical gaps in the user's reasoning.
    Introduce at least one piece of evidence (even if approximate).
    Be analytical and composed.
  `,

  Hard: `
    Actively identify logical fallacies in the user's argument
    (e.g. false equivalence, appeal to emotion, hasty generalization).
    Name the fallacy if you spot one. Use rigorous cause-and-effect reasoning.
    Be precise about definitions. Don't let vague claims slide.
  `,

  Expert: `
    Be relentless. Challenge every unstated assumption.
    Demand specificity — if the user says "studies show", ask which studies.
    Use expert-level vocabulary, edge cases, and second-order effects.
    Anticipate and pre-empt the user's next likely argument.
    This is a high-pressure environment that simulates real competitive debate.
  `,
};

// ─── DEBATE STYLES ────────────────────────────────────────────
// TODO_B2: Each style should produce NOTICEABLY different AI behavior.
// Test each one yourself — if Socratic and Standard feel the same, iterate.
const STYLE_INSTRUCTIONS = {
  standard: `
    Debate style: Classic rebuttal.
    Directly challenge the user's claims with counter-arguments.
    Structure: acknowledge their point briefly → then dismantle it → then offer your stronger alternative.
  `,

  socratic: `
    Debate style: Socratic method.
    Do NOT make direct counter-claims. Instead, respond primarily with
    probing questions that expose the weaknesses or unstated assumptions
    in the user's argument. Each question should be targeted, not rhetorical.
    End with 1 pointed question the user must answer to defend their position.
    Example: Instead of "That's wrong because X", say "But what evidence do you
    have that X leads to Y? And haven't studies in [domain] shown the opposite?"
  `,

  crossexam: `
    Debate style: Cross-examination.
    Identify the single weakest link in the user's argument and attack it
    relentlessly. Don't spread your attack — go deep on one vulnerability.
    Use the user's own words against them where possible.
    Be sharp, almost adversarial. This should feel like a courtroom cross-exam.
  `,

  oxford: `
    Debate style: Oxford Union formal debate.
    Structure your response with clear formality:
    1. "I oppose the motion that [restate topic]..."
    2. Present your opposition argument with numbered points
    3. Formally rebut the user's specific claim
    Keep language elevated and structured. Avoid contractions.
    This is a formal academic setting.
  `,
};

// ─── GRADING RUBRIC ───────────────────────────────────────────
// TODO_B3: This rubric determines what users improve on.
// It's the most important prompt to get right — test it with weak AND strong arguments.
// Current: 4 categories × 25 points = 100 total
// Feel free to rename categories, adjust weights, or add a 5th.
const GRADING_RUBRIC = `
You are a strict but fair debate judge. Grade the user's LAST argument only using this rubric:

RUBRIC (100 points total):
1. Claim Clarity (25 pts) — Is their main point stated clearly and specifically?
   25 = crystal clear and well-scoped
   15 = somewhat clear but vague in parts  
   5  = unclear or buried in filler

2. Evidence Quality (25 pts) — Do they support claims with facts, examples, or logic?
   25 = strong specific evidence or tight logical chain
   15 = some support but could be stronger
   5  = assertion without support ("everyone knows that...")

3. Rebuttal Strength (25 pts) — Did they meaningfully address your previous argument?
   25 = directly engaged with and dismantled your specific point
   15 = partially addressed it but left gaps
   5  = ignored your argument entirely

4. Structure & Delivery (25 pts) — Is the argument well-organized and impactful?
   25 = clear progression, strong opening, confident close
   15 = decent structure but rambles or drops threads
   5  = disorganized or trailing off

OUTPUT FORMAT (strictly follow this):
Score: [total]/100 — [one sharp sentence: identify the single most impactful improvement they can make]

Do NOT list the categories in your output. Just the single score line above.
Make feedback specific to what they actually said, not generic.
`;

// ─── OPENING PROMPT ──────────────────────────────────────────
// TODO_B5: The first AI message sets the tone.
// Make it punchy enough that the user WANTS to fire back.
// It should feel like a challenge, not a lecture.
const OPENING_PROMPT = `
Make your opening argument against this topic. Rules:
- 2-3 sentences maximum
- State your position boldly — no hedging
- End with something that implicitly invites the user to respond
  (a provocative claim, a surprising statistic, a rhetorical challenge)
- Do NOT greet the user. Start immediately with your argument.
`;

// ─── MAIN EXPORT: buildSystemPrompt ──────────────────────────
/**
 * Builds the full system prompt for each debate turn.
 * Called by Person A's DebateArena component.
 *
 * @param {object} params
 * @param {string} params.topic    — The debate topic
 * @param {string} params.level    — 'Easy' | 'Medium' | 'Hard' | 'Expert'
 * @param {string} params.style    — 'standard' | 'socratic' | 'crossexam' | 'oxford'
 * @param {number} params.round    — Current round number
 * @returns {string} Full system prompt
 */
export function buildSystemPrompt({ topic, level, style, round }) {
  const levelInstr = LEVEL_INSTRUCTIONS[level] || LEVEL_INSTRUCTIONS.Easy;
  const styleInstr = STYLE_INSTRUCTIONS[style] || STYLE_INSTRUCTIONS.standard;

  return `
You are a skilled debate opponent AND a debate coach.

TOPIC: "${topic}"
YOUR ROLE: Argue AGAINST the most commonly held position on this topic.
           If the topic is stated as a belief (e.g. "X is good"), argue X is bad.
           If the topic is a question, take the less popular answer.

ROUND: ${round}
DIFFICULTY: ${level}
${levelInstr}

${styleInstr}

${GRADING_RUBRIC}

RESPONSE FORMAT (every turn after round 1):
Line 1: Score: [N]/100 — [specific one-sentence feedback]
[blank line]
[Your rebuttal/argument in 2-4 sentences, matching the style above]

RULES:
- Never break character as the opposing debater
- Never agree with the user's position
- Keep rebuttals concise — quality over length
- Round ${round}: ${round <= 2 ? "establish your core position clearly" : round <= 4 ? "escalate — find the holes in their logic" : "go for the jugular — leave no argument standing"}
`.trim();
}

// ─── MAIN EXPORT: buildSummaryPrompt ─────────────────────────
/**
 * TODO_B4: Build this prompt for the end-of-session coach summary.
 * Called after round 5+ when the user ends the debate.
 *
 * The summary should:
 * 1. Identify 2-3 PATTERNS in the user's debating (not just round-by-round)
 * 2. Name their biggest weakness specifically
 * 3. Give 2 concrete, actionable drills to improve
 * 4. End with a motivating line that makes them want to debate again
 *
 * @param {object} params
 * @param {string} params.topic       — The debate topic
 * @param {number[]} params.scores    — Array of per-round scores
 * @param {string} params.transcript  — Full debate as formatted text
 * @returns {string} Summary system prompt
 */
export function buildSummaryPrompt({ topic, scores, transcript }) {
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const trend =
    scores[scores.length - 1] > scores[0]
      ? "improving"
      : scores[scores.length - 1] < scores[0]
      ? "declining"
      : "consistent";

  // TODO_B4: Write a real coach prompt here.
  // The transcript contains everything said — use it to give SPECIFIC feedback.
  // E.g. if the user kept using emotional appeals, name that pattern.
  // If they never responded to your counter-arguments, point that out.
  // Below is a STARTER — replace with something more nuanced.

  return `
You are a world-class debate coach giving a post-session debrief.

TOPIC DEBATED: "${topic}"
ROUNDS COMPLETED: ${scores.length}
AVERAGE SCORE: ${avg}/100
SCORE TREND: ${trend} (${scores.join(", ")})

FULL DEBATE TRANSCRIPT:
${transcript}

YOUR TASK — write a coaching debrief with this structure:

## What you did well
[1-2 genuine strengths observed in their arguments — be specific, reference actual things they said]

## Your biggest pattern to fix
[The single most recurring weakness. Give it a name (e.g. "Unsupported assertions", "Ignoring rebuttals").
 Quote a specific line from their debate that shows this weakness.]

## Two drills for this week
[Drill 1: A specific daily practice to address their weakness]
[Drill 2: A debate technique to add to their toolkit]

## Final verdict
[One punchy line: their overall grade, what it means, and what they should debate next]

Tone: Direct, expert, encouraging but honest. No fluff.
`.trim();
}

// ─── HELPER EXPORT: getOpeningPrompt ─────────────────────────
export function getOpeningPrompt() {
  return OPENING_PROMPT.trim();
}

// ─── HELPER EXPORT: shouldEscalate ───────────────────────────
/**
 * Decides whether to escalate difficulty this round.
 * Person A calls this after each round to update levelIdx.
 *
 * Current logic: escalate if last 2 scores average ≥ 72.
 * TODO_B: Tune these thresholds. Maybe also de-escalate if avg drops < 40?
 *
 * @param {number[]} scores  — All scores so far
 * @param {number}   levelIdx — Current level index (0-3)
 * @returns {{ newLevelIdx: number, escalated: boolean }}
 */
export function shouldEscalate(scores, levelIdx) {
  if (scores.length < 2 || levelIdx >= 3) {
    return { newLevelIdx: levelIdx, escalated: false };
  }

  const recentAvg = scores.slice(-2).reduce((a, b) => a + b, 0) / 2;

  // Escalate if recent avg ≥ 72
  if (recentAvg >= 72) {
    return { newLevelIdx: levelIdx + 1, escalated: true };
  }

  // TODO_B: Add de-escalation? If recentAvg < 40, drop a level?
  // if (recentAvg < 40 && levelIdx > 0) return { newLevelIdx: levelIdx - 1, escalated: false };

  return { newLevelIdx: levelIdx, escalated: false };
}

// ─── TEST HARNESS (run with: node promptEngine.js) ────────────
// TODO_B: Uncomment to test your prompts without the UI.
// You can paste the output into Claude.ai to see how it responds.
//
// const testParams = {
//   topic: "Social media does more harm than good",
//   level: "Medium",
//   style: "socratic",
//   round: 3,
// };
// console.log("=== SYSTEM PROMPT ===");
// console.log(buildSystemPrompt(testParams));
// console.log("\n=== OPENING PROMPT ===");
// console.log(getOpeningPrompt());
