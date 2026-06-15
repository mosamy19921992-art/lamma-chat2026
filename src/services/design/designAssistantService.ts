import type {
  ChatTheme,
  DesignAssistantAudit,
  DesignAssistantFinding,
  DesignAssistantPatch,
  DesignAssistantProposal,
  DesignAssistantProposalId,
  WallTheme,
} from "../../lib/chatTypes";

interface DesignAssistantContext {
  activeRoomId: string;
  activeRoomName: string;
  totalRooms: number;
  brandLogoUrl: string | null;
  chatTheme: ChatTheme;
  glowColor: string;
  ownerBgImage: string | null;
  roomBgMap: Record<string, string>;
  wallTheme: WallTheme;
  defaultAmbientBg: string;
}

function clampScore(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function isValidHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function getHexBrightness(value: string): number | null {
  if (!isValidHexColor(value)) return null;
  const hex = value.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function getThemeMood(theme: ChatTheme): "classic" | "calm" | "night" | "premium" {
  if (theme === "charcoal-calm" || theme === "olive-ink") return "calm";
  if (theme === "violet-night") return "night";
  if (theme === "night-paper") return "premium";
  return "classic";
}

function getWallThemeSuggestedTheme(wallTheme: WallTheme): ChatTheme {
  if (wallTheme === "violet") return "violet-night";
  if (wallTheme === "ice") return "charcoal-calm";
  return "night-paper";
}

function getWallThemeSuggestedGlow(wallTheme: WallTheme): string {
  if (wallTheme === "violet") return "#8b5cf6";
  if (wallTheme === "ice") return "#93c5fd";
  return "#d4a63a";
}

function getRoomCoverageScore(context: DesignAssistantContext): number {
  if (context.totalRooms <= 0) return 100;
  const customizedRoomCount = Object.keys(context.roomBgMap).filter(
    (key) => Boolean(context.roomBgMap[key]?.trim()),
  ).length;
  const ratio = customizedRoomCount / context.totalRooms;
  return clampScore(40 + ratio * 60);
}

function getIdentityScore(context: DesignAssistantContext): number {
  let score = 100;
  if (!context.brandLogoUrl?.trim()) score -= 28;
  if (!context.ownerBgImage?.trim()) score -= 14;
  if (context.chatTheme === "classic") score -= 14;
  if (!isValidHexColor(context.glowColor)) score -= 10;
  return clampScore(score);
}

function getReadabilityScore(context: DesignAssistantContext): number {
  let score = 100;
  const mood = getThemeMood(context.chatTheme);
  if (mood === "classic") score -= 18;
  if (mood === "night") score += 4;
  if (mood === "calm") score += 6;

  const brightness = getHexBrightness(context.glowColor);
  if (brightness === null) {
    score -= 14;
  } else if (brightness < 35 || brightness > 235) {
    score -= 12;
  } else if (brightness >= 70 && brightness <= 200) {
    score += 2;
  }

  return clampScore(score);
}

function getPolishScore(context: DesignAssistantContext): number {
  let score = 100;
  const suggestedTheme = getWallThemeSuggestedTheme(context.wallTheme);
  if (context.chatTheme !== suggestedTheme) score -= 12;
  if (getThemeMood(context.chatTheme) === "classic") score -= 10;
  if (!isValidHexColor(context.glowColor)) score -= 10;
  return clampScore(score);
}

function getActiveRoomScore(context: DesignAssistantContext): number {
  let score = 100;
  if (!context.roomBgMap[context.activeRoomId]?.trim()) score -= 24;
  if (!context.ownerBgImage?.trim()) score -= 8;
  return clampScore(score);
}

export function buildDesignAssistantFindings(
  context: DesignAssistantContext,
): DesignAssistantFinding[] {
  const findings: DesignAssistantFinding[] = [];
  const roomCoverageScore = getRoomCoverageScore(context);
  const brightness = getHexBrightness(context.glowColor);

  if (!context.brandLogoUrl?.trim()) {
    findings.push({
      tone: "critical",
      title: "الهوية غير موحدة",
      text: "الشعار داخل الشات ما زال افتراضيًا؛ وده يضعف شخصية البراند ويقلل الإحساس بالاحتراف.",
    });
  } else {
    findings.push({
      tone: "good",
      title: "هوية الشعار",
      text: "الشعار المخصص ظاهر داخل الشات، وده يثبت الهوية البصرية بشكل ممتاز.",
    });
  }

  if (context.chatTheme === "classic") {
    findings.push({
      tone: "warn",
      title: "ثيم تقليدي",
      text: "ثيم الشات ما زال كلاسيكي؛ الأفضل التحول لثيم أهدى أو أفخم لرفع جودة الواجهة.",
    });
  } else {
    findings.push({
      tone: "good",
      title: "ثيم مخصص",
      text: `الثيم الحالي (${context.chatTheme}) يرفع جودة القراءة ويبعد الشات عن الشكل الافتراضي.`,
    });
  }

  if (!context.roomBgMap[context.activeRoomId]?.trim()) {
    findings.push({
      tone: "warn",
      title: "الغرفة بلا بصمة",
      text: `الغرفة الحالية (${context.activeRoomName}) تعتمد على الخلفية العامة فقط، وده يضعف شخصية الغرفة.`,
    });
  } else {
    findings.push({
      tone: "good",
      title: "غرفة مخصصة",
      text: `الغرفة الحالية (${context.activeRoomName}) لها خلفية مستقلة، وده يعطيها حضورًا أوضح.`,
    });
  }

  if (!context.ownerBgImage?.trim()) {
    findings.push({
      tone: "warn",
      title: "خلفية عامة ناقصة",
      text: "الخلفية العامة غير مخصصة حاليًا، وبالتالي التجربة تعتمد على الصورة الافتراضية.",
    });
  } else {
    findings.push({
      tone: "good",
      title: "خلفية عامة نشطة",
      text: "الخلفية العامة المخصصة تمنح الشات طبقة إضافية من الفخامة والتماسك.",
    });
  }

  if (!isValidHexColor(context.glowColor)) {
    findings.push({
      tone: "critical",
      title: "إضاءة غير صالحة",
      text: "لون الإضاءة الحالي ليس بصيغة HEX سليمة، وده يهدد اتساق الشكل النهائي.",
    });
  } else if (brightness !== null && (brightness < 35 || brightness > 235)) {
    findings.push({
      tone: "warn",
      title: "إضاءة حادة",
      text: `لون الإضاءة الحالي (${context.glowColor}) صالح تقنيًا لكنه حاد بصريًا ويحتاج توازنًا أفضل.`,
    });
  } else {
    findings.push({
      tone: "good",
      title: "إضاءة متوازنة",
      text: `لون الإضاءة الحالي (${context.glowColor}) متوازن ويمكن البناء عليه في المقترحات القادمة.`,
    });
  }

  if (roomCoverageScore < 55) {
    findings.push({
      tone: "warn",
      title: "تغطية الغرف ضعيفة",
      text: "عدد قليل فقط من الغرف يملك تخصيصًا مرئيًا؛ يستحسن رفع التغطية حتى يبدو المشروع كاملاً.",
    });
  } else if (roomCoverageScore >= 80) {
    findings.push({
      tone: "good",
      title: "تغطية قوية",
      text: "معظم الغرف لديها تخصيصات مرئية واضحة، وده يزيد الإحساس بأن كل غرفة لها شخصية مستقلة.",
    });
  }

  return findings;
}

function getRecommendedProposalId(
  identityScore: number,
  readabilityScore: number,
  roomScore: number,
  polishScore: number,
): DesignAssistantProposalId {
  if (identityScore <= 68) return "identity-refresh";
  if (roomScore <= 70) return "immersive";
  if (readabilityScore <= 72) return "calm";
  if (polishScore <= 74) return "premium";
  return "room-focus";
}

export function buildDesignAssistantAudit(
  context: DesignAssistantContext,
): DesignAssistantAudit {
  const findings = buildDesignAssistantFindings(context);
  const identityScore = getIdentityScore(context);
  const readabilityScore = getReadabilityScore(context);
  const roomScore = getActiveRoomScore(context);
  const polishScore = getPolishScore(context);
  const score = clampScore(
    identityScore * 0.3 +
      readabilityScore * 0.25 +
      roomScore * 0.25 +
      polishScore * 0.2,
    48,
    100,
  );

  const recommendedPreset = getRecommendedProposalId(
    identityScore,
    readabilityScore,
    roomScore,
    polishScore,
  );

  const highlights: string[] = [];
  if (identityScore < 75) {
    highlights.push("أولوية الآن: تقوية الهوية البصرية بالشعار والخلفية العامة.");
  }
  if (roomScore < 75) {
    highlights.push(`الغرفة الحالية (${context.activeRoomName}) تحتاج بصمة بصرية أوضح.`);
  }
  if (readabilityScore < 75) {
    highlights.push("التجربة البصرية الحالية تحتاج هدوءًا أعلى لتسهيل القراءة الطويلة.");
  }
  if (polishScore < 75) {
    highlights.push("هناك تضارب بسيط بين الثيم، الجدران، والإضاءة ويمكن ضبطه بسهولة.");
  }
  if (highlights.length === 0) {
    highlights.push("الشكل الحالي قوي، وأفضل خطوة الآن هي تحسين ذكي موجه للغرفة المفتوحة.");
  }

  const quickWins: string[] = [];
  if (!context.brandLogoUrl?.trim()) {
    quickWins.push("فعّل شعارًا مخصصًا داخل الشات لتثبيت الهوية فورًا.");
  }
  if (context.chatTheme === "classic") {
    quickWins.push("غيّر ثيم الشات من الكلاسيكي إلى ثيم أحدث مثل Night Paper أو Charcoal Calm.");
  }
  if (!context.roomBgMap[context.activeRoomId]?.trim()) {
    quickWins.push(`أضف خلفية خاصة لغرفة ${context.activeRoomName} حتى تحس إن لها شخصية مستقلة.`);
  }
  if (!isValidHexColor(context.glowColor)) {
    quickWins.push("اضبط لون الإضاءة إلى HEX صالح وواضح قبل أي تحسينات أخرى.");
  }
  if (quickWins.length === 0) {
    quickWins.push("ابدأ باقتراح ذكي ثم راجع النتيجة المتوقعة قبل التطبيق.");
    quickWins.push("احفظ الستايل الحالي كنسخة احتياطية قبل أي تغيير كبير.");
  }

  const verdict =
    score >= 90
      ? "المظهر قوي جداً وقريب من مستوى احترافي"
      : score >= 78
        ? "المظهر جيد جداً لكنه ما زال يستفيد من تحسين ذكي"
        : score >= 65
          ? "المظهر مقبول لكن يحتاج ترقية بصرية واضحة"
          : "المظهر يحتاج إعادة ضبط ذكية قبل الاعتماد عليه";

  const nextActionMap: Record<DesignAssistantProposalId, string> = {
    premium: "جرّب الستايل الفاخر لرفع الفخامة وتوحيد الحضور.",
    calm: "جرّب الستايل الهادئ لتحسين القراءة وتقليل الزحام اللوني.",
    night: "جرّب الستايل الليلي لإظهار شخصية أعمق وأكثر حداثة.",
    "room-focus": "طبّق اقتراح الغرفة الحالية لتحسين المشهد المفتوح الآن فقط.",
    "identity-refresh": "ابدأ باقتراح تحديث الهوية لتقوية الشعار والخلفية العامة.",
    immersive: "فعّل وضع الغمر لإعطاء الغرفة الحالية حضورًا بصريًا أقوى.",
  };

  return {
    score,
    verdict,
    roomLabel: context.activeRoomName,
    highlights,
    findings,
    identityScore,
    readabilityScore,
    roomScore,
    polishScore,
    nextAction: nextActionMap[recommendedPreset],
    recommendedPreset,
    quickWins,
  };
}

function applyPatchToContext(
  context: DesignAssistantContext,
  patch: DesignAssistantPatch,
): DesignAssistantContext {
  const nextRoomBgMap = { ...context.roomBgMap };
  if (typeof patch.roomBgCurrent !== "undefined") {
    if (patch.roomBgCurrent?.trim()) {
      nextRoomBgMap[context.activeRoomId] = patch.roomBgCurrent.trim();
    } else {
      delete nextRoomBgMap[context.activeRoomId];
    }
  }

  return {
    ...context,
    wallTheme: patch.wallTheme ?? context.wallTheme,
    brandLogoUrl:
      typeof patch.brandLogoUrl === "undefined"
        ? context.brandLogoUrl
        : patch.brandLogoUrl,
    glowColor: patch.glowColor ?? context.glowColor,
    ownerBgImage:
      typeof patch.ownerBgImage === "undefined"
        ? context.ownerBgImage
        : patch.ownerBgImage,
    roomBgMap: nextRoomBgMap,
    chatTheme: patch.chatTheme ?? context.chatTheme,
  };
}

function buildProposalMetadata(
  id: DesignAssistantProposalId,
  patch: DesignAssistantPatch,
  context: DesignAssistantContext,
  reasoning: string[],
  title: string,
  summary: string,
  focusArea: string,
  impact: "خفيف" | "متوسط" | "قوي",
  confidence: number,
  beforeState: string,
  afterState: string,
  implementationSteps: string[],
): DesignAssistantProposal {
  const simulatedAudit = buildDesignAssistantAudit(applyPatchToContext(context, patch));
  const warnings: string[] = [];

  if (typeof patch.ownerBgImage !== "undefined" && !patch.ownerBgImage) {
    warnings.push("المقترح لا يضيف خلفية عامة جديدة، فسيظل جزء من الهوية معتمدًا على الافتراضي.");
  }
  if (typeof patch.roomBgCurrent !== "undefined" && !patch.roomBgCurrent) {
    warnings.push("المقترح قد يزيل تخصيص الغرفة الحالية لصالح مظهر أنظف وأخف.");
  }
  if (!context.brandLogoUrl?.trim() && typeof patch.brandLogoUrl === "undefined") {
    warnings.push("لا يزال الشعار المخصص غير مفعّل، لذلك قوة البراند لن تصل لأقصى مستوى.");
  }

  return {
    id,
    title,
    summary,
    changes: patch,
    reasoning,
    focusArea,
    impact,
    confidence,
    expectedScore: simulatedAudit.score,
    warnings,
    beforeState,
    afterState,
    implementationSteps,
  };
}

export function buildDesignAssistantProposal(
  preset: DesignAssistantProposalId,
  context: DesignAssistantContext,
): DesignAssistantProposal {
  const sharedLogo = context.brandLogoUrl?.trim() || "/images/lamma-logo-nice.png";
  const suggestedTheme = getWallThemeSuggestedTheme(context.wallTheme);
  const suggestedGlow = getWallThemeSuggestedGlow(context.wallTheme);
  const sharedRoomBg =
    context.roomBgMap[context.activeRoomId]?.trim() ||
    context.ownerBgImage?.trim() ||
    context.defaultAmbientBg;

  if (preset === "premium") {
    return buildProposalMetadata(
      "premium",
      {
        wallTheme: "fire",
        glowColor: "#d4a63a",
        brandLogoUrl: sharedLogo,
        chatTheme: "night-paper",
      },
      context,
      [
        "يوحد الشعار مع المظهر العام ويعطي انطباعًا أفخم.",
        "يعتمد على إضاءة ذهبية أهدأ من اللمعان الحاد.",
        "يرفع مستوى التناسق بين الجدران والثيم العام.",
      ],
      "الستايل الفاخر",
      "يطور الشات إلى طابع ذهبي هادئ مع حضور أقوى للهوية البصرية.",
      "الفخامة والهوية",
      "متوسط",
      92,
      "الشكل الحالي جيد لكنه ما زال يفتقد الإحساس الفاخر الواضح داخل الواجهة.",
      "واجهة أفخم بإضاءة ذهبية هادئة وثيم أكثر احترافية مع حضور أقوى للهوية.",
      [
        "فعّل الشعار الموحد في الهيدر.",
        "حوّل الجدران إلى النمط الناري الناعم.",
        "طبّق ثيم Night Paper ثم راقب التناسق العام.",
      ],
    );
  }

  if (preset === "calm") {
    return buildProposalMetadata(
      "calm",
      {
        wallTheme: "ice",
        glowColor: "#93c5fd",
        chatTheme: "charcoal-calm",
        roomBgCurrent: null,
      },
      context,
      [
        "يقلل الزحام اللوني داخل الغرفة الحالية.",
        "يمنح القراءة الطويلة راحة أعلى وهدوءًا بصريًا.",
        "يحافظ على هوية واضحة لكن بأقل تشويش ممكن.",
      ],
      "الستايل الهادئ",
      "يهدئ المشهد ويجعل القراءة أسهل، خصوصًا في الجلسات الطويلة.",
      "الراحة والوضوح",
      "خفيف",
      90,
      "الواجهة الحالية قد تبدو مزدحمة بصريًا أو مرهقة في الجلسات الطويلة.",
      "واجهة هادئة ومريحة للعين مع قراءة أوضح وتشتت أقل.",
      [
        "خفف الإضاءة إلى درجة باردة متوازنة.",
        "استبدل الثيم الحالي بـ Charcoal Calm.",
        "قلل تخصيصات الغرفة الحالية إذا كانت تشتت النظر.",
      ],
    );
  }

  if (preset === "night") {
    return buildProposalMetadata(
      "night",
      {
        wallTheme: "violet",
        glowColor: "#8b5cf6",
        chatTheme: "violet-night",
        brandLogoUrl: sharedLogo,
      },
      context,
      [
        "يمنح الواجهة حضورًا ليليًا حديثًا وواضحًا.",
        "يوائم بين الجدران البنفسجية والثيم الليلي مباشرة.",
        "يحافظ على الشعار ظاهرًا لضمان ثبات الهوية.",
      ],
      "الستايل الليلي",
      "يحوّل الشات إلى شخصية ليلية أقوى مع لمعة بنفسجية متوازنة.",
      "الهوية الليلية",
      "متوسط",
      88,
      "التصميم الحالي لا يقدم شخصية ليلية واضحة رغم قابلية الشات لهذا الاتجاه.",
      "واجهة ليلية عصرية بإضاءة بنفسجية متناسقة وهوية أعمق.",
      [
        "اختر جدران بنفسجية لتحديد المزاج العام.",
        "طبّق Violet Night كقاعدة للواجهة.",
        "ثبّت لون اللمعة البنفسجي ليحافظ على التماسك.",
      ],
    );
  }

  if (preset === "identity-refresh") {
    return buildProposalMetadata(
      "identity-refresh",
      {
        brandLogoUrl: sharedLogo,
        ownerBgImage: context.ownerBgImage?.trim() || context.defaultAmbientBg,
        glowColor: suggestedGlow,
        chatTheme: context.chatTheme === "classic" ? "olive-ink" : context.chatTheme,
      },
      context,
      [
        "يوحد الشعار والخلفية العامة لتقوية البراند.",
        "ينقل الثيم من الكلاسيكي إلى شكل أحدث إن لزم.",
        "يحافظ على معظم المشهد الحالي بدون تغييرات عنيفة.",
      ],
      "تحديث الهوية",
      "يعالج أسرع نقاط الضعف المتعلقة بالشعار والخلفية العامة وتناسق الهوية.",
      "البراند والاتساق",
      "متوسط",
      94,
      "الهوية الحالية متفرقة أو غير ظاهرة بشكل كفاية بين الشعار والخلفيات.",
      "هوية موحدة وأسهل في التذكر بوجود شعار ثابت وخلفية عامة متناسقة.",
      [
        "ثبت الشعار المخصص داخل الشات أولاً.",
        "أضف أو أكد الخلفية العامة الأساسية.",
        "اضبط الثيم والإضاءة بحيث يدعموا البراند بدل ما يتعارضوا معه.",
      ],
    );
  }

  if (preset === "immersive") {
    return buildProposalMetadata(
      "immersive",
      {
        roomBgCurrent: sharedRoomBg,
        chatTheme: suggestedTheme,
        glowColor: suggestedGlow,
        brandLogoUrl: sharedLogo,
      },
      context,
      [
        `يمنح غرفة ${context.activeRoomName} حضورًا بصريًا مستقلاً.`,
        "يضبط الثيم والإضاءة حسب حالة الجدران الحالية.",
        "يرفع الإحساس بالغمر من دون تغيير قاسٍ لباقي المشروع.",
      ],
      "وضع الغمر",
      "يركز على الغرفة الحالية ويمنحها بصمة أقوى وأكثر حضورًا.",
      "تجربة الغرفة",
      "قوي",
      89,
      "الغرفة الحالية لا تعطي إحساسًا كافيًا بأنها مساحة مستقلة ذات طابع خاص.",
      "غرفة بحضور بصري واضح يشعر العضو فورًا أنه دخل مساحة مختلفة ومميزة.",
      [
        `خصص خلفية صريحة لغرفة ${context.activeRoomName}.`,
        "طابق الثيم مع لون الجدران الحالي.",
        "اضبط الإضاءة والشعار بحيث يخدموا الغرفة المفتوحة لا باقي المشهد فقط.",
      ],
    );
  }

  return buildProposalMetadata(
    "room-focus",
    {
      chatTheme: suggestedTheme,
      glowColor: suggestedGlow,
      brandLogoUrl: sharedLogo,
    },
    context,
    [
      `يركز على الغرفة الحالية (${context.activeRoomName}) بدل تعديل عام غير موجه.`,
      "يضبط الإضاءة والثيم حسب لون الجدران الحالي.",
      "يحافظ على الشعار حاضرًا داخل الهيدر لضمان ثبات الهوية.",
    ],
    `اقتراح مخصص لغرفة ${context.activeRoomName}`,
    "يضبط الشكل الحالي بما يناسب الغرفة المفتوحة الآن دون قلب المشهد كله.",
    "الغرفة الحالية",
    "خفيف",
    91,
    "المشهد الحالي مقبول، لكنه يحتاج ضبطًا موجهًا للغرفة المفتوحة فقط.",
    "تحسين دقيق وسريع يرفع جودة الغرفة الحالية من غير تغييرات واسعة على المشروع كله.",
    [
      `راجع احتياج غرفة ${context.activeRoomName} الفعلي أولاً.`,
      "طبّق الثيم والإضاءة المقترحين.",
      "افحص النتيجة ثم احفظها كستايل لو عجبتك.",
    ],
  );
}
