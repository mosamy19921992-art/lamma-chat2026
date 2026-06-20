// Games Bot — trivia & mini-games for the Games room
// Commands: /سؤال  /تلميح  /نقاط  /إجابة  /لعبة  /كلمة

export interface GameQuestion {
  question: string;
  answer: string;
  hint: string;
  category: string;
}

const TRIVIA_POOL: GameQuestion[] = [
  // جغرافيا
  { question: "ما هي عاصمة المملكة العربية السعودية؟", answer: "الرياض", hint: "تبدأ بحرف الراء", category: "جغرافيا" },
  { question: "ما هي أطول نهر في العالم؟", answer: "النيل", hint: "يمر بمصر وإثيوبيا", category: "جغرافيا" },
  { question: "ما هي عاصمة فرنسا؟", answer: "باريس", hint: "فيها برج مشهور", category: "جغرافيا" },
  { question: "ما هي أكبر قارات العالم مساحةً؟", answer: "آسيا", hint: "فيها الصين والهند", category: "جغرافيا" },
  { question: "ما هي عاصمة تركيا؟", answer: "أنقرة", hint: "وليست إسطنبول!", category: "جغرافيا" },
  { question: "كم عدد دول العالم تقريباً؟", answer: "195", hint: "رقم قريب من 200", category: "جغرافيا" },
  { question: "ما هي أصغر دولة في العالم مساحةً؟", answer: "الفاتيكان", hint: "دولة داخل روما", category: "جغرافيا" },
  { question: "ما هي عاصمة الإمارات العربية المتحدة؟", answer: "أبوظبي", hint: "وليست دبي!", category: "جغرافيا" },
  // علوم
  { question: "ما هو أكبر كوكب في المجموعة الشمسية؟", answer: "المشتري", hint: "كوكب غازي ضخم", category: "علوم" },
  { question: "كم عدد عناصر الجدول الدوري الحالي؟", answer: "118", hint: "رقم بين 100 و200", category: "علوم" },
  { question: "ما هو الغاز الأكثر وفرةً في الغلاف الجوي للأرض؟", answer: "النيتروجين", hint: "78% من الهواء", category: "علوم" },
  { question: "ما رمز الذهب في الجدول الدوري؟", answer: "Au", hint: "من كلمة لاتينية", category: "علوم" },
  { question: "كم عدد عظام الجسم البشري عند البالغين؟", answer: "206", hint: "أقل من 300", category: "علوم" },
  { question: "من اخترع المصباح الكهربائي؟", answer: "توماس إديسون", hint: "اسمه الأول توماس", category: "علوم" },
  { question: "ما هو أسرع حيوان بري في العالم؟", answer: "الفهد", hint: "يصل لـ 120 كم/ساعة", category: "علوم" },
  // تاريخ وثقافة
  { question: "في أي عام فُتحت القسطنطينية على يد العثمانيين؟", answer: "1453", hint: "بعد 1400 وقبل 1500", category: "تاريخ" },
  { question: "من هو مؤسس شركة Apple؟", answer: "ستيف جوبز", hint: "اسمه الأول ستيف", category: "تقنية" },
  { question: "كم عدد أيام السنة الميلادية العادية؟", answer: "365", hint: "رقم يبدأ بثلاثة", category: "عام" },
  { question: "ما هي أقدم حضارة في العالم؟", answer: "السومرية", hint: "في بلاد الرافدين", category: "تاريخ" },
  { question: "من كتب رواية ألف ليلة وليلة؟", answer: "مجهول", hint: "لا يعرف مؤلفها", category: "أدب" },
  { question: "ما هو لون العلم المصري في المنتصف؟", answer: "الأبيض", hint: "ألوان الثلاثة أحمر وأبيض وأسود", category: "عام" },
  { question: "كم عدد أضلاع المسدس؟", answer: "6", hint: "ثلاثة ضعف اثنين", category: "رياضيات" },
  // رياضة وترفيه
  { question: "كم عدد لاعبي فريق كرة القدم في الملعب؟", answer: "11", hint: "رقم فردي بين 10 و12", category: "رياضة" },
  { question: "في أي دولة ظهرت كرة القدم لأول مرة؟", answer: "إنجلترا", hint: "دولة أوروبية", category: "رياضة" },
  { question: "كم عدد دورات الأولمبياد بين كل دورة وأخرى؟", answer: "4", hint: "ربع عقد", category: "رياضة" },
  { question: "ما هو اسم بطل فيلم The Lion King عربياً؟", answer: "سيمبا", hint: "أسد صغير", category: "ترفيه" },
  { question: "كم عدد كواكب المجموعة الشمسية؟", answer: "8", hint: "بعد إزالة بلوتو", category: "علوم" },
  { question: "من هو مخترع الهاتف؟", answer: "غراهام بيل", hint: "اسمه الأخير بيل", category: "تاريخ" },
  { question: "ما هي اللغة الأكثر انتشاراً في العالم؟", answer: "الإنجليزية", hint: "تُدرَّس في كل بلد", category: "عام" },
  { question: "ما هو عدد أوجه مكعب الثلج؟", answer: "6", hint: "مثل المسدس", category: "رياضيات" },
];

// ألعاب كلمات — كلمة عكسية
const WORD_GAMES: Array<{ word: string; clue: string }> = [
  { word: "بيت", clue: "كلمة من 3 حروف تعني المنزل — ما عكسها؟" },
  { word: "نور", clue: "كلمة من 3 حروف مقابل الظلام — ما عكسها؟" },
  { word: "كتاب", clue: "وعاء المعرفة مقلوب — ما هو؟" },
  { word: "حلم", clue: "ما يراه النائم مقلوباً؟" },
  { word: "رحلة", clue: "سفر وانتقال — اقلبها!" },
  { word: "قلب", clue: "مقلوبها كلمة أخرى — ايه هي؟" },
];

// حالة اللعبة (module-level — مشتركة بين جميع المستخدمين في نفس المتصفح)
interface GameState {
  activeQuestion: (GameQuestion & { revealedHint: boolean; startedAt: number }) | null;
  activeWordGame: { word: string; clue: string; startedAt: number } | null;
  scores: Record<string, number>;
  questionAnswered: boolean;
  cooldownUntil: number; // timestamp
}

const state: GameState = {
  activeQuestion: null,
  activeWordGame: null,
  scores: (() => {
    try {
      return JSON.parse(localStorage.getItem("lamma_games_scores") || "{}");
    } catch {
      return {};
    }
  })(),
  questionAnswered: false,
  cooldownUntil: 0,
};

function saveScores() {
  try {
    localStorage.setItem("lamma_games_scores", JSON.stringify(state.scores));
  } catch {
    // ignore
  }
}

function pickRandom<T>(arr: T[]): T {
  if (arr.length === 0) {
    throw new Error("pickRandom requires a non-empty array");
  }
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\u0621-\u064Aa-z0-9\s]/g, "");
}

function buildScoreBoard(): string {
  const entries = Object.entries(state.scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  if (entries.length === 0) return "لا يوجد نقاط بعد — اكتب /سؤال لتبدأ!";
  const medals = ["🥇", "🥈", "🥉"];
  return (
    "🏆 لوحة الشرف:\n" +
    entries
      .map(([name, pts], i) => `${medals[i] || `${i + 1}.`} ${name} — ${pts} نقطة`)
      .join("\n")
  );
}

export type GameBotResult = {
  botMessage: string;
  isWin?: boolean;
  preventSend?: boolean;
} | null;

export function handleGameCommand(
  text: string,
  senderNickname: string,
): GameBotResult {
  const trimmed = text.trim();
  const now = Date.now();

  // --- /نقاط or /leaderboard ---
  if (/^\/نقاط|^\/leaderboard|^\/scores/i.test(trimmed)) {
    return { botMessage: buildScoreBoard(), preventSend: true };
  }

  // --- /كلمة — word-reversal game ---
  if (/^\/كلمة|^\/word/i.test(trimmed)) {
    if (now < state.cooldownUntil) {
      return {
        botMessage: `⏳ انتظر ${Math.ceil((state.cooldownUntil - now) / 1000)} ثانية قبل لعبة جديدة.`,
        preventSend: true,
      };
    }
    const game = pickRandom(WORD_GAMES);
    state.activeWordGame = { ...game, startedAt: now };
    state.activeQuestion = null;
    state.questionAnswered = false;
    state.cooldownUntil = now + 20_000;
    return {
      botMessage: `🔤 لعبة الكلمة المقلوبة!\n${game.clue}\n\n💬 اكتب إجابتك مباشرة في الشات!`,
      preventSend: true,
    };
  }

  // --- /سؤال or /trivia ---
  if (/^\/سؤال|^\/trivia|^\/quiz/i.test(trimmed)) {
    if (now < state.cooldownUntil) {
      return {
        botMessage: `⏳ يوجد سؤال نشط! انتظر ${Math.ceil((state.cooldownUntil - now) / 1000)} ثانية أو اكتب /تلميح للمساعدة.`,
        preventSend: true,
      };
    }
    const q = pickRandom(TRIVIA_POOL);
    state.activeQuestion = { ...q, revealedHint: false, startedAt: now };
    state.activeWordGame = null;
    state.questionAnswered = false;
    state.cooldownUntil = now + 30_000;
    return {
      botMessage: `🧠 سؤال ${q.category}!\n\n❓ ${q.question}\n\n💬 اكتب إجابتك مباشرة — أول واحد يجاوب صح يكسب 10 نقاط!`,
      preventSend: true,
    };
  }

  // --- /تلميح or /hint ---
  if (/^\/تلميح|^\/hint/i.test(trimmed)) {
    if (state.activeQuestion && !state.questionAnswered) {
      state.activeQuestion.revealedHint = true;
      return {
        botMessage: `💡 تلميح: ${state.activeQuestion.hint}\n\nالوقت المتبقي: ${Math.max(0, Math.ceil((state.activeQuestion.startedAt + 30_000 - now) / 1000))} ثانية`,
        preventSend: true,
      };
    }
    if (state.activeWordGame) {
      const reversed = state.activeWordGame.word.split("").reverse().join("");
      return {
        botMessage: `💡 تلميح: الكلمة مقلوبة هي "${reversed.replace(/./g, (c, i) => (i === 0 ? c : "·"))}"`,
        preventSend: true,
      };
    }
    return { botMessage: "❓ لا يوجد سؤال نشط. اكتب /سؤال لتبدأ!", preventSend: true };
  }

  // --- /تخطى or /skip ---
  if (/^\/تخطى|^\/skip/i.test(trimmed)) {
    if (state.activeQuestion && !state.questionAnswered) {
      const ans = state.activeQuestion.answer;
      state.activeQuestion = null;
      state.questionAnswered = true;
      state.cooldownUntil = now + 10_000;
      return { botMessage: `⏭️ تم التخطي! الإجابة الصحيحة كانت: "${ans}"`, preventSend: true };
    }
    if (state.activeWordGame) {
      const word = state.activeWordGame.word;
      state.activeWordGame = null;
      state.cooldownUntil = now + 10_000;
      return { botMessage: `⏭️ تم التخطي! الكلمة الأصلية كانت: "${word}"`, preventSend: true };
    }
    return { botMessage: "لا يوجد لعبة نشطة للتخطي.", preventSend: true };
  }

  // --- /مساعدة or /help ---
  if (/^\/مساعدة|^\/help|^\/لعبة/i.test(trimmed)) {
    return {
      botMessage:
        "🎮 أوامر Games Bot:\n\n" +
        "🧠 /سؤال — سؤال معلومات عامة\n" +
        "🔤 /كلمة — لعبة كلمة مقلوبة\n" +
        "💡 /تلميح — تلميح للسؤال الحالي\n" +
        "⏭️ /تخطى — تخطي السؤال الحالي\n" +
        "🏆 /نقاط — لوحة الشرف\n\n" +
        "💬 للإجابة — اكتب الإجابة مباشرة في الشات!",
      preventSend: true,
    };
  }

  return null;
}

export function checkAnswer(
  text: string,
  senderNickname: string,
): GameBotResult {
  if (state.questionAnswered) return null;

  // Check trivia answer
  if (state.activeQuestion) {
    const normalized = normalize(text);
    const correctNorm = normalize(state.activeQuestion.answer);
    if (normalized === correctNorm || normalized.includes(correctNorm)) {
      const q = state.activeQuestion;
      state.questionAnswered = true;
      state.activeQuestion = null;
      state.cooldownUntil = Date.now() + 8_000;

      state.scores[senderNickname] = (state.scores[senderNickname] || 0) + 10;
      saveScores();

      const total = state.scores[senderNickname];
      return {
        botMessage:
          `🎉 صح! ${senderNickname} أجاب أول وكسب 10 نقاط!\n` +
          `✅ الإجابة: "${q.answer}"\n` +
          `⭐ مجموع نقاطه: ${total} نقطة\n\n` +
          `اكتب /سؤال لسؤال جديد!`,
        isWin: true,
      };
    }
  }

  // Check word game answer
  if (state.activeWordGame) {
    const reversed = state.activeWordGame.word.split("").reverse().join("");
    const normInput = normalize(text);
    const normReversed = normalize(reversed);
    if (normInput === normReversed) {
      const original = state.activeWordGame.word;
      state.activeWordGame = null;
      state.questionAnswered = true;
      state.cooldownUntil = Date.now() + 8_000;

      state.scores[senderNickname] = (state.scores[senderNickname] || 0) + 5;
      saveScores();

      return {
        botMessage:
          `🎉 ${senderNickname} عرفها! الكلمة كانت "${original}" مقلوبة → "${reversed}"\n` +
          `⭐ +5 نقاط! مجموعه: ${state.scores[senderNickname]}`,
        isWin: true,
      };
    }
  }

  return null;
}

export function getActiveGameSummary(): string | null {
  if (state.activeQuestion && !state.questionAnswered) {
    const elapsed = Math.floor((Date.now() - state.activeQuestion.startedAt) / 1000);
    return `🎯 سؤال نشط منذ ${elapsed}ث: "${state.activeQuestion.question.slice(0, 40)}..."`;
  }
  if (state.activeWordGame) {
    return `🔤 لعبة الكلمة نشطة — اكتب /تلميح للمساعدة`;
  }
  return null;
}
