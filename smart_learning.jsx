import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";

/**
 * SmartLearning.jsx
 * A self-contained React component for "Smart Learning" features:
 * - Fetch lessons from an API (lessonsApi prop)
 * - Gracefully handle API errors / empty lessons (shows friendly message)
 * - Generate quizzes automatically from lesson text (or use lesson.quiz if provided)
 * - Show reasoning / explanation for answers
 * - Enforce sequential progression: user must complete current lesson to unlock the next
 * - Show last visit and next recommended visit date (default every 2 days)
 * - Stores progress & last visit locally (localStorage), pluggable to your backend
 *
 * How to use:
 * <SmartLearning lessonsApi="/api/lessons" userId="user123" autoVisitIntervalDays={2} />
 *
 * Notes:
 * - Replace the lessonsApi with your real endpoint. The component expects an array of lessons
 *   where each lesson is an object like: { id, title, body } or { id, title, content }.
 * - If you want stronger quiz generation using an LLM, call your LLM endpoint from
 *   generateQuizFromLesson instead of using the local heuristic generator.
 */

export default function SmartLearning({
  lessonsApi = "/api/lessons",
  userId = "guest",
  autoVisitIntervalDays = 2,
  minPassPercent = 60,
}) {
  const storageKeyProgress = `smartLearning_progress_${userId}`;
  const storageKeyLastVisit = `smartLearning_lastVisit_${userId}`;

  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [progress, setProgress] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKeyProgress);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });
  const [lastVisit, setLastVisit] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKeyLastVisit);
      return raw ? new Date(raw) : new Date();
    } catch (e) {
      return new Date();
    }
  });

  useEffect(() => {
    fetchLessons();
    // update last visit to now when component mounts (first render in this session)
    const now = new Date();
    setLastVisit(now);
    localStorage.setItem(storageKeyLastVisit, now.toISOString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storageKeyProgress, JSON.stringify(progress));
    } catch (e) {
      console.warn("Failed to save progress", e);
    }
  }, [progress]);

  async function fetchLessons() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(lessonsApi);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      // Expecting an array of lessons. If not present or empty -> message
      if (!Array.isArray(data) || data.length === 0) {
        setError("Lessons are currently not available — please come back later.");
        setLessons([]);
      } else {
        setLessons(data);
        // ensure currentIndex is within bounds
        setCurrentIndex((idx) => Math.min(idx, Math.max(0, data.length - 1)));
      }
    } catch (err) {
      console.error(err);
      setError("Lessons are currently not available — please come back later.");
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }

  // Utility helpers
  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function formatFullDate(date) {
    return new Date(date).toLocaleString(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Heuristic quiz generator: tries to generate multiple-choice Qs from lesson text.
  function generateQuizFromLesson(lesson, numQuestions = 3) {
    // If lesson already provides a quiz, use it directly
    if (lesson.quiz && Array.isArray(lesson.quiz) && lesson.quiz.length > 0) {
      return lesson.quiz.map((q, i) => ({ ...q, id: `${lesson.id || "l"}-provided-${i}` }));
    }

    const text = (lesson.content || lesson.body || lesson.text || lesson.description || "").replace(/\s+/g, " ").trim();
    if (!text || text.length < 30) {
      // fallback: create a short true/false question
      return [
        {
          id: `${lesson.id || "l"}-tf-0",
          type: "tf",
          prompt: `Is this lesson about ${lesson.title || "the topic"}?`,
          options: ["True", "False"],
          answer: "True",
          explanation: lesson.summary || text || "Review the lesson content.",
        },
      ];
    }

    const sentences = text.split(/(?<=[.?!])\s+/).filter((s) => s.length > 20);
    const words = Array.from(new Set((text.match(/\b[A-Za-z]{4,}\b/g) || []).map((w) => w.trim())));

    const qs = [];
    for (let i = 0; i < Math.min(numQuestions, Math.max(1, sentences.length)); i++) {
      const sentence = sentences[i % sentences.length];
      const candidates = (sentence.match(/\b[A-Za-z]{4,}\b/g) || []).filter((w) => w.length >= 4);
      let answer = candidates.sort((a, b) => b.length - a.length)[0] || candidates[0] || words[0] || "concept";

      // Build options
      const distractPool = words.filter((w) => w.toLowerCase() !== answer.toLowerCase());
      const distractors = shuffle(distractPool).slice(0, 3);
      const options = shuffle([answer, ...distractors]);

      // Create a prompt that blanks out the answer inside the sentence (if possible)
      let prompt = sentence;
      const regex = new RegExp(answer, "i");
      if (regex.test(sentence)) {
        prompt = sentence.replace(regex, "_____ (missing word) ");
      } else {
        prompt = `Which term best completes the idea: "${sentence.substring(0, 80)}..."`;
      }

      qs.push({
        id: `${lesson.id || "l"}-q${i}`,
        type: "mcq",
        prompt: prompt,
        options,
        answer,
        explanation: sentence,
      });
    }

    return qs;
  }

  function handleGenerateQuiz() {
    const lesson = lessons[currentIndex];
    if (!lesson) return;
    const generated = generateQuizFromLesson(lesson, 3);
    setQuiz(generated);
    setAnswers({});
    setScore(null);
  }

  function handleAnswerChange(qid, value) {
    setAnswers((a) => ({ ...a, [qid]: value }));
  }

  function gradeQuiz() {
    if (!quiz) return;
    let correct = 0;
    quiz.forEach((q) => {
      const userAns = (answers[q.id] || "").toString().trim();
      if (!userAns) return;
      if (q.type === "mcq" || q.type === "tf") {
        if (userAns.toLowerCase() === (q.answer || "").toString().toLowerCase()) correct++;
      }
    });
    const pct = Math.round((correct / quiz.length) * 100);
    setScore(pct);

    // mark progress for this lesson
    const lessonId = lessons[currentIndex]?.id || `index-${currentIndex}`;
    setProgress((p) => ({ ...p, [lessonId]: { completed: pct >= minPassPercent, score: pct, timestamp: new Date().toISOString() } }));
  }

  function canGoToNext() {
    const lessonId = lessons[currentIndex]?.id || `index-${currentIndex}`;
    return progress[lessonId] && progress[lessonId].completed;
  }

  function goNext() {
    if (!lessons.length) return;
    if (!canGoToNext()) {
      // Encourage user to complete current lesson
      alert("Please complete this lesson (pass the quiz) to unlock the next lesson.");
      return;
    }
    setCurrentIndex((i) => Math.min(lessons.length - 1, i + 1));
    setQuiz(null);
    setAnswers({});
    setScore(null);
  }

  function goPrev() {
    setCurrentIndex((i) => Math.max(0, i - 1));
    setQuiz(null);
    setAnswers({});
    setScore(null);
  }

  const currentLesson = lessons[currentIndex];

  const nextVisit = useMemo(() => addDays(lastVisit, autoVisitIntervalDays), [lastVisit, autoVisitIntervalDays]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <h1 className="text-2xl font-semibold">Smart Learning</h1>
        <p className="text-sm text-slate-600">Engaging quizzes, step-by-step progression, and reasoning built in.</p>
      </motion.header>

      <div className="flex flex-col md:flex-row gap-4">
        <section className="flex-1 bg-white border rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs text-slate-500">Last visit</div>
              <div className="text-sm font-medium">{formatFullDate(lastVisit)}</div>
              <div className="text-xs text-slate-500 mt-1">Next recommended visit</div>
              <div className="text-sm font-medium">{formatFullDate(nextVisit)}</div>
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs">Visit every {autoVisitIntervalDays} days</div>
              <div className="mt-2 text-xs text-slate-500">We recommend returning often — small, repeated practice works best.</div>
            </div>
          </div>

          <div className="mb-3 flex gap-2">
            <button
              onClick={() => fetchLessons()}
              className="px-3 py-2 rounded-lg bg-sky-600 text-white text-sm shadow-sm"
            >
              Refresh lessons
            </button>
            <button
              onClick={() => {
                // update last visit
                const now = new Date();
                setLastVisit(now);
                localStorage.setItem(storageKeyLastVisit, now.toISOString());
                alert("Thanks for visiting — your next recommended visit will be calculated.");
              }}
              className="px-3 py-2 rounded-lg border text-sm"
            >
              Mark visit now
            </button>
          </div>

          <div className="mt-2">
            {loading && <div className="text-sm text-slate-500">Loading lessons...</div>}
            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}

            {!loading && !error && (
              <div>
                {lessons.length === 0 ? (
                  <div className="text-sm text-slate-500">No lessons found.</div>
                ) : (
                  <div>
                    <div className="text-xs text-slate-500">Lesson {currentIndex + 1} of {lessons.length}</div>
                    <h2 className="text-lg font-semibold mt-2">{currentLesson?.title || "Untitled Lesson"}</h2>
                    <p className="text-sm mt-2 text-slate-700 leading-relaxed max-h-44 overflow-auto">{(currentLesson?.content || currentLesson?.body || currentLesson?.description || "No content provided.")}</p>

                    <div className="mt-4 flex gap-2">
                      <button className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm" onClick={handleGenerateQuiz}>Generate quiz</button>
                      <button className="px-3 py-2 rounded-lg border text-sm" onClick={() => alert("Tip: complete the short quiz to unlock the next lesson.")}>How progression works</button>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm">
                      <button onClick={goPrev} disabled={currentIndex === 0} className="px-3 py-1 rounded bg-slate-100">Prev</button>
                      <button onClick={goNext} disabled={currentIndex >= lessons.length - 1} className="px-3 py-1 rounded bg-slate-100">Next</button>
                      <div className="ml-auto text-xs text-slate-500">Progress required to unlock next: {minPassPercent}%</div>
                    </div>

                    <div className="mt-3">
                      <div className="text-xs text-slate-500">Your progress for this lesson:</div>
                      <div className="text-sm">
                        {(() => {
                          const lid = currentLesson?.id || `index-${currentIndex}`;
                          const p = progress[lid];
                          if (!p) return <span className="text-slate-500">Not attempted</span>;
                          return <span className={p.completed ? "text-green-600" : "text-amber-600"}>{p.score}% — {p.completed ? "Passed" : "Try again"}</span>;
                        })()}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="w-full md:w-96 bg-white border rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold">Quiz & Reasoning</h3>

          {!quiz && (
            <div className="mt-3 text-sm text-slate-600">No quiz generated yet. Click <strong>Generate quiz</strong> to create a short, reasoning-enabled quiz from this lesson. If your API provides a quiz inside the lesson object it will be used directly.</div>
          )}

          {quiz && (
            <div className="mt-3">
              <form onSubmit={(e) => { e.preventDefault(); gradeQuiz(); }}>
                {quiz.map((q, i) => (
                  <div key={q.id} className="mb-3 p-3 border rounded-lg">
                    <div className="text-sm font-medium">Q{i + 1}. {q.prompt}</div>
                    <div className="mt-2 space-y-2">
                      {q.options && q.options.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={(answers[q.id] || "") === opt}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>

                    <details className="mt-2 text-xs text-slate-600">
                      <summary className="cursor-pointer">Show reasoning / explanation</summary>
                      <div className="mt-2">{q.explanation}</div>
                    </details>
                  </div>
                ))}

                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm">Submit answers</button>
                  <button type="button" onClick={() => { setQuiz(null); setAnswers({}); setScore(null); }} className="px-3 py-2 rounded-lg border text-sm">Clear</button>
                </div>

                {score !== null && (
                  <div className="mt-3 text-sm">
                    <div>Your score: <strong className={score >= minPassPercent ? 'text-green-600' : 'text-amber-600'}>{score}%</strong></div>
                    {score >= minPassPercent ? (
                      <div className="text-sm text-green-600">Great — you passed! The next lesson is unlocked.</div>
                    ) : (
                      <div className="text-sm text-amber-600">Keep trying — review the lesson and retake the quiz to pass.</div>
                    )}
                  </div>
                )}

              </form>
            </div>
          )}

        </aside>
      </div>

      <footer className="mt-6 text-sm text-slate-500">
        Tip: Consistent short sessions are more effective than long cramming. We'll remind you to visit every {autoVisitIntervalDays} days. If lessons are missing, our message will say: "Lessons are currently not available — please come back later.".
      </footer>
    </div>
  );
}
