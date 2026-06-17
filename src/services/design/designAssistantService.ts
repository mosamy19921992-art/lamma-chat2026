import type {
  DesignAssistantAudit,
  DesignAssistantFinding,
  DesignAssistantPatch,
  DesignAssistantProposal,
  DesignAssistantProposalId,
} from "../../lib/chatTypes";
import {
  describeLayoutBalance,
  getLayoutPreset,
  type ChatLayoutPrefs,
} from "../../lib/chatLayoutPrefs";

interface DesignAssistantContext {
  activeRoomId: string;
  activeRoomName: string;
  totalRooms: number;
  brandLogoUrl: string | null;
  ownerBgImage: string | null;
  roomBgMap: Record<string, string>;
  defaultAmbientBg: string;
  layoutPrefs: ChatLayoutPrefs;
  customFaceEnabled: boolean;
  customFaceBubbleRadius: number;
}

function clampScore(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
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
  if (!context.brandLogoUrl?.trim()) score -= 35;
  if (!context.ownerBgImage?.trim()) score -= 20;
  return clampScore(score);
}

function getActiveRoomScore(context: DesignAssistantContext): number {
  let score = 100;
  if (!context.roomBgMap[context.activeRoomId]?.trim()) score -= 30;
  if (!context.ownerBgImage?.trim()) score -= 10;
  return clampScore(score);
}

function getPolishScore(context: DesignAssistantContext): number {
  let score = 85;
  if (!context.brandLogoUrl?.trim()) score -= 15;
  if (!context.roomBgMap[context.activeRoomId]?.trim()) score -= 10;
  return clampScore(score);
}

export function buildDesignAssistantFindings(
  context: DesignAssistantContext,
): DesignAssistantFinding[] {
  const findings: DesignAssistantFinding[] = [];
  const roomCoverageScore = getRoomCoverageScore(context);

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

  if (roomCoverageScore < 55) {
    findings.push({
      tone: "warn",
      title: "تغطية الغرف ضعيفة",
      text: "عدد قليل فقط من الغرف يملك تخصيصًا مرئيًا؛ يستحسن رفع التغطية حتى يبدو المشروع كاملاً.",
    });
  } else   if (roomCoverageScore >= 80) {
    findings.push({
      tone: "good",
      title: "تغطية قوية",
      text: "معظم الغرف لديها تخصيصات مرئية واضحة، وده يزيد الإحساس بأن كل غرفة لها شخصية مستقلة.",
    });
  }

  const layoutBalance = describeLayoutBalance(context.layoutPrefs);
  if (!layoutBalance.isBalanced) {
    findings.push({
      tone: "warn",
      title: "تقسيم الأعمدة يحتاج ضبط",
      text: layoutBalance.notes[0] || "نسب الأقسام الجانبية غير متوازنة وقد تؤثر على سهولة الاستخدام.",
    });
  } else {
    findings.push({
      tone: "good",
      title: "توازن التقسيم",
      text: "أقسام الأعمدة الجانبية متوازنة ومناسبة للتصفح اليومي.",
    });
  }

  if (!context.customFaceEnabled) {
    findings.push({
      tone: "warn",
      title: "الوجه المخصص غير مفعّل",
      text: "استوديو التصميم يمكنه تفعيل وجه هندسي أو سمة مخصصة لرفع تميز الواجهة.",
    });
  } else if (context.customFaceBubbleRadius <= 8) {
    findings.push({
      tone: "good",
      title: "وجه هندسي نشط",
      text: "الزوايا الحادة والألوان الباردة تعطي إحساسًا تقنيًا واضحًا.",
    });
  }

  return findings;
}

function getLayoutScore(context: DesignAssistantContext): number {
  return describeLayoutBalance(context.layoutPrefs).score;
}

function getRecommendedProposalId(
  identityScore: number,
  roomScore: number,
  polishScore: number,
  layoutScore: number,
  context: DesignAssistantContext,
): DesignAssistantProposalId {
  if (layoutScore < 72) return "layout-balance";
  if (!context.customFaceEnabled || context.customFaceBubbleRadius > 10) {
    return "geometric";
  }
  if (identityScore <= 65) return "identity-refresh";
  if (roomScore <= 70) return "immersive";
  if (polishScore <= 74) return "premium";
  return "room-focus";
}

export function buildDesignAssistantAudit(
  context: DesignAssistantContext,
): DesignAssistantAudit {
  const findings = buildDesignAssistantFindings(context);
  const identityScore = getIdentityScore(context);
  const readabilityScore = 80;
  const roomScore = getActiveRoomScore(context);
  const polishScore = getPolishScore(context);
  const layoutScore = getLayoutScore(context);
  const score = clampScore(
    identityScore * 0.3 +
      readabilityScore * 0.18 +
      roomScore * 0.22 +
      polishScore * 0.18 +
      layoutScore * 0.12,
    48,
    100,
  );

  const recommendedPreset = getRecommendedProposalId(
    identityScore,
    roomScore,
    polishScore,
    layoutScore,
    context,
  );

  const highlights: string[] = [];
  if (identityScore < 75) {
    highlights.push("أولوية الآن: تقوية الهوية البصرية بالشعار والخلفية العامة.");
  }
  if (roomScore < 75) {
    highlights.push(`الغرفة الحالية (${context.activeRoomName}) تحتاج بصمة بصرية أوضح.`);
  }
  if (polishScore < 75) {
    highlights.push("يمكن رفع مستوى الصقل عن طريق تنسيق الشعار مع الخلفيات.");
  }
  if (layoutScore < 78) {
    highlights.push("أعد ضبط تقسيم الأعمدة الجانبية لتحسين التصفح والتركيز على الشات.");
  }
  if (highlights.length === 0) {
    highlights.push("الشكل الحالي قوي، وأفضل خطوة الآن هي تحسين ذكي موجه للغرفة المفتوحة.");
  }

  const quickWins: string[] = [];
  if (!context.brandLogoUrl?.trim()) {
    quickWins.push("فعّل شعارًا مخصصًا داخل الشات لتثبيت الهوية فورًا.");
  }
  if (!context.roomBgMap[context.activeRoomId]?.trim()) {
    quickWins.push(`أضف خلفية خاصة لغرفة ${context.activeRoomName} حتى تحس إن لها شخصية مستقلة.`);
  }
  if (layoutScore < 78) {
    quickWins.push("جرّب «توازن التقسيم» لإعادة ضبط الأعمدة الجانبية تلقائيًا.");
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
    geometric: "فعّل الوجه الهندسي مع تقسيم متوازن للأعمدة.",
    "layout-balance": "أعد توازن الأعمدة الجانبية بين المتجر والراديو والغرف.",
    "layout-chat-focus": "وسّع منطقة الشات بتقليل مساحة الأقسام الجانبية.",
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
    brandLogoUrl:
      typeof patch.brandLogoUrl === "undefined" ? context.brandLogoUrl : patch.brandLogoUrl,
    ownerBgImage:
      typeof patch.ownerBgImage === "undefined" ? context.ownerBgImage : patch.ownerBgImage,
    roomBgMap: nextRoomBgMap,
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
  if (patch.layoutSections) {
    warnings.push("سيتم تغيير نسب تقسيم الأعمدة الجانبية؛ يمكنك سحب الفواصل يدويًا بعد التطبيق.");
  }
  if (patch.customFacePresetId) {
    warnings.push("سيتم تطبيق وجه مخصص جديد من استوديو التصميم.");
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
  const sharedLogo = context.brandLogoUrl?.trim() || "/images/lamma-app-icon-512.png";
  const sharedRoomBg =
    context.roomBgMap[context.activeRoomId]?.trim() ||
    context.ownerBgImage?.trim() ||
    context.defaultAmbientBg;

  if (preset === "premium") {
    return buildProposalMetadata(
      "premium",
      { brandLogoUrl: sharedLogo, customFacePresetId: "gold" },
      context,
      [
        "يوحد الشعار مع المظهر العام ويعطي انطباعًا أفخم.",
        "يرفع مستوى التناسق البصري العام.",
      ],
      "الستايل الفاخر",
      "يطور الشات إلى طابع أكثر احترافية مع حضور أقوى للهوية البصرية.",
      "الفخامة والهوية",
      "متوسط",
      92,
      "الشكل الحالي جيد لكنه ما زال يفتقد الإحساس الفاخر الواضح داخل الواجهة.",
      "واجهة أفخم مع حضور أقوى للهوية.",
      [
        "فعّل الشعار الموحد في الهيدر.",
        "راجع الخلفيات العامة للغرف.",
      ],
    );
  }

  if (preset === "calm") {
    return buildProposalMetadata(
      "calm",
      { roomBgCurrent: null, customFacePresetId: "ocean" },
      context,
      [
        "يقلل الزحام البصري داخل الغرفة الحالية.",
        "يمنح القراءة الطويلة راحة أعلى وهدوءًا بصريًا.",
      ],
      "الستايل الهادئ",
      "يهدئ المشهد ويجعل القراءة أسهل، خصوصًا في الجلسات الطويلة.",
      "الراحة والوضوح",
      "خفيف",
      88,
      "الواجهة الحالية قد تبدو مزدحمة بصريًا أو مرهقة في الجلسات الطويلة.",
      "واجهة هادئة ومريحة للعين مع قراءة أوضح وتشتت أقل.",
      [
        "قلل تخصيصات الغرفة الحالية إذا كانت تشتت النظر.",
        "استخدم استوديو التصميم لاختيار سمة هادئة.",
      ],
    );
  }

  if (preset === "night") {
    return buildProposalMetadata(
      "night",
      { brandLogoUrl: sharedLogo, customFacePresetId: "void" },
      context,
      [
        "يمنح الواجهة حضورًا ليليًا حديثًا وواضحًا.",
        "يحافظ على الشعار ظاهرًا لضمان ثبات الهوية.",
      ],
      "الستايل الليلي",
      "يحوّل الشات إلى شخصية ليلية أقوى.",
      "الهوية الليلية",
      "متوسط",
      87,
      "التصميم الحالي لا يقدم شخصية ليلية واضحة.",
      "واجهة ليلية عصرية وهوية أعمق.",
      [
        "استخدم استوديو التصميم لاختيار السمة الليلية.",
        "ثبّت الشعار ليحافظ على التماسك.",
      ],
    );
  }

  if (preset === "identity-refresh") {
    return buildProposalMetadata(
      "identity-refresh",
      {
        brandLogoUrl: sharedLogo,
        ownerBgImage: context.ownerBgImage?.trim() || context.defaultAmbientBg,
      },
      context,
      [
        "يوحد الشعار والخلفية العامة لتقوية البراند.",
        "يحافظ على معظم المشهد الحالي بدون تغييرات عنيفة.",
      ],
      "تحديث الهوية",
      "يعالج أسرع نقاط الضعف المتعلقة بالشعار والخلفية العامة وتناسق الهوية.",
      "البراند والاتساق",
      "متوسط",
      93,
      "الهوية الحالية متفرقة أو غير ظاهرة بشكل كفاية بين الشعار والخلفيات.",
      "هوية موحدة وأسهل في التذكر بوجود شعار ثابت وخلفية عامة متناسقة.",
      [
        "ثبت الشعار المخصص داخل الشات أولاً.",
        "أضف أو أكد الخلفية العامة الأساسية.",
      ],
    );
  }

  if (preset === "immersive") {
    return buildProposalMetadata(
      "immersive",
      { roomBgCurrent: sharedRoomBg, brandLogoUrl: sharedLogo },
      context,
      [
        `يمنح غرفة ${context.activeRoomName} حضورًا بصريًا مستقلاً.`,
        "يرفع الإحساس بالغمر من دون تغيير قاسٍ لباقي المشروع.",
      ],
      "وضع الغمر",
      "يركز على الغرفة الحالية ويمنحها بصمة أقوى وأكثر حضورًا.",
      "تجربة الغرفة",
      "قوي",
      88,
      "الغرفة الحالية لا تعطي إحساسًا كافيًا بأنها مساحة مستقلة ذات طابع خاص.",
      "غرفة بحضور بصري واضح يشعر العضو فورًا أنه دخل مساحة مختلفة ومميزة.",
      [
        `خصص خلفية صريحة لغرفة ${context.activeRoomName}.`,
        "ثبّت الشعار بحيث يخدم الغرفة المفتوحة.",
      ],
    );
  }

  if (preset === "geometric") {
    return buildProposalMetadata(
      "geometric",
      {
        customFacePresetId: "geometric",
        layoutSections: getLayoutPreset("balanced"),
      },
      context,
      [
        "يفعّل وجهًا هندسيًا بزوايا حادة وألوان تقنية.",
        "يعيد توازن تقسيم الأعمدة لقراءة أوضح.",
      ],
      "الوجه الهندسي",
      "يطبّق سمة هندسية حادة مع تقسيم متوازن للأعمدة الجانبية.",
      "الشكل والتقسيم",
      "متوسط",
      91,
      "الواجهة تعتمد على زوايا ناعمة أو تقسيم غير متوازن.",
      "مظهر هندسي تقني مع أعمدة جانبية متوازنة وسهلة التصفح.",
      [
        "يفعّل preset الهندسي في استوديو الوجه.",
        "يضبط نسب المتجر والراديو والموسيقى والغرف.",
      ],
    );
  }

  if (preset === "layout-balance") {
    return buildProposalMetadata(
      "layout-balance",
      { layoutSections: getLayoutPreset("balanced") },
      context,
      [
        "يعيد نسب الأقسام الجانبية إلى توازن متساوٍ.",
        "يحافظ على الألوان والوجه الحاليين.",
      ],
      "توازن التقسيم",
      "يضبط نسب الأعمدة الجانبية دون تغيير الهوية البصرية.",
      "تقسيم الواجهة",
      "خفيف",
      89,
      describeLayoutBalance(context.layoutPrefs).notes.join(" ") ||
        "التقسيم الحالي قد يكون غير متوازن بين الأقسام.",
      "أعمدة جانبية متوازنة بين المتجر والراديو والموسيقى والغرف والأعضاء.",
      [
        "يُعاد ضبط الفواصل بين الأقسام تلقائيًا.",
        "يمكنك سحب الفواصل يدويًا بعد التطبيق.",
      ],
    );
  }

  if (preset === "layout-chat-focus") {
    return buildProposalMetadata(
      "layout-chat-focus",
      { layoutSections: getLayoutPreset("chat-focus") },
      context,
      [
        "يوسّع منطقة الشات بتقليل مساحة الأقسام الجانبية.",
        "يرفع مساحة قائمة الغرف في العمود الأيمن.",
      ],
      "تركيز على الشات",
      "يقلل ازدحام الأعمدة الجانبية ويعطي الشات مساحة أكبر.",
      "تقسيم الواجهة",
      "متوسط",
      88,
      "الأقسام الجانبية تأخذ مساحة كبيرة عن الشات المركزي.",
      "شات أوسع مع أقسام جانبية مضغوطة ومركّزة.",
      [
        "يُضبط العمود الأيسر لصالح الموسيقى.",
        "يُوسّع قسم الغرف في العمود الأيمن.",
      ],
    );
  }

  return buildProposalMetadata(
    "room-focus",
    { brandLogoUrl: sharedLogo },
    context,
    [
      `يركز على الغرفة الحالية (${context.activeRoomName}) بدل تعديل عام غير موجه.`,
      "يحافظ على الشعار حاضرًا داخل الهيدر لضمان ثبات الهوية.",
    ],
    `اقتراح مخصص لغرفة ${context.activeRoomName}`,
    "يضبط الشكل الحالي بما يناسب الغرفة المفتوحة الآن دون قلب المشهد كله.",
    "الغرفة الحالية",
    "خفيف",
    90,
    "المشهد الحالي مقبول، لكنه يحتاج ضبطًا موجهًا للغرفة المفتوحة فقط.",
    "تحسين دقيق وسريع يرفع جودة الغرفة الحالية من غير تغييرات واسعة على المشروع كله.",
    [
      `راجع احتياج غرفة ${context.activeRoomName} الفعلي أولاً.`,
      "افحص النتيجة ثم احفظها كستايل لو عجبتك.",
    ],
  );
}
