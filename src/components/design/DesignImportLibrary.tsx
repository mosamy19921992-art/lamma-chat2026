import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Globe,
  Loader2,
  RotateCcw,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import {
  BUILTIN_DESIGN_IMPORT_PACKS,
  DESIGN_IMPORT_CATEGORY_LABELS,
  type DesignImportCategory,
  type DesignImportPack,
  getImportPacksByCategory,
} from "../../services/design/designImportCatalog";
import {
  addImportedDesignPack,
  fetchDesignPackFromUrl,
  loadImportedDesignPacks,
  resolvePublicImportUrl,
} from "../../services/design/designNetImportService";
import {
  applyUiverseCssToTarget,
  fetchUiverseCssFromUrl,
  getActiveUiverseScopedApplies,
  resetUiverseScopedStyle,
  type UiverseFetchResult,
} from "../../services/design/uiverseScopedImportService";
import { resolveUiverseTargetFromText } from "../../services/design/uiverseTargetResolver";
import { ThemePackSandbox } from "./ThemePackSandbox";
import { UiverseCssPreview } from "./UiverseCssPreview";

interface DesignImportLibraryProps {
  /** Apply pack to live site (after isolated sandbox review) */
  onApplyToSite: (pack: DesignImportPack) => void;
  pendingPackId?: string | null;
  activePackId?: string | null;
}

const CATEGORY_ORDER = Object.keys(
  DESIGN_IMPORT_CATEGORY_LABELS,
) as DesignImportCategory[];

function ImportPackCard({
  pack,
  isSelected,
  isPending,
  isActive,
  onSelect,
}: {
  pack: DesignImportPack;
  isSelected?: boolean;
  isPending?: boolean;
  isActive?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-xl border text-right transition-all duration-200 w-full ${
        isPending
          ? "border-amber-400/65 ring-2 ring-amber-400/40"
          : isSelected
            ? "border-violet-400/60 ring-2 ring-violet-400/30"
            : isActive
              ? "border-emerald-400/55 ring-1 ring-emerald-400/35"
              : "border-white/10 hover:border-emerald-400/45"
      }`}
    >
      <div
        className="relative h-[52px] w-full overflow-hidden"
        style={{ background: pack.previewGradient }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        {pack.sourceUrl && (
          <span className="absolute top-1.5 left-1.5 px-1 py-0.5 rounded text-[6px] font-black bg-black/50 text-cyan-200 border border-cyan-400/30">
            مستورد
          </span>
        )}
      </div>
      <div className="p-2 bg-white/[0.05] border-t border-white/8">
        <div className="text-[9px] font-black text-white truncate">
          {pack.emoji} {pack.title}
        </div>
        <div className="text-[7px] text-gray-500 font-bold mt-0.5 line-clamp-1">
          {pack.subtitle}
        </div>
      </div>
    </button>
  );
}

export function DesignImportLibrary({
  onApplyToSite,
  pendingPackId,
  activePackId,
}: DesignImportLibraryProps) {
  const [category, setCategory] = useState<DesignImportCategory>("colors");
  const [selectedPack, setSelectedPack] = useState<DesignImportPack | null>(
    () => BUILTIN_DESIGN_IMPORT_PACKS[0] ?? null,
  );
  const [imported, setImported] = useState<DesignImportPack[]>(() =>
    loadImportedDesignPacks(),
  );
  const [urlInput, setUrlInput] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [fetching, setFetching] = useState(false);
  const [applying, setApplying] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState<string | null>(null);
  const [fetchedCss, setFetchedCss] = useState<UiverseFetchResult | null>(null);
  const [scopedApplies, setScopedApplies] = useState(() =>
    getActiveUiverseScopedApplies(),
  );

  const categoryPacks = useMemo(
    () => getImportPacksByCategory(category, imported),
    [category, imported],
  );

  const refreshImported = useCallback(() => {
    setImported(loadImportedDesignPacks());
  }, []);

  useEffect(() => {
    refreshImported();
  }, [refreshImported]);

  useEffect(() => {
    if (categoryPacks.length === 0) return;
    if (!categoryPacks.some((p) => p.id === selectedPack?.id)) {
      setSelectedPack(categoryPacks[0]);
    }
  }, [categoryPacks, selectedPack?.id]);

  const refreshScopedApplies = useCallback(() => {
    setScopedApplies(getActiveUiverseScopedApplies());
  }, []);

  const handleFetchUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setFetching(true);
    setFetchError(null);
    setFetchSuccess(null);
    setFetchedCss(null);

    const { result, error } = await fetchUiverseCssFromUrl(trimmed);
    setFetching(false);

    if (result?.css) {
      setFetchedCss(result);
      const suggested =
        result.suggestedTargetAr === "بطاقات الأعمدة"
          ? "بطاقة الراديو"
          : result.suggestedTargetAr?.includes("زر")
            ? "الأزرار"
            : "بطاقة الراديو";
      if (!targetInput.trim()) {
        setTargetInput(suggested);
      }
      setFetchSuccess(
        `✅ تم جلب CSS من ${result.source === "galaxy" ? "Galaxy" : "UIverse"}${result.title ? ` — ${result.title}` : ""}. شوف المعاينة على اليمين ← ثم «تطبيق».`,
      );
      return;
    }

    const { pack, error: packError } = await fetchDesignPackFromUrl(trimmed);
    if (pack) {
      const next = addImportedDesignPack(pack);
      setImported(next);
      setSelectedPack(pack);
      setFetchSuccess(`✅ تم استيراد «${pack.title}»`);
      return;
    }

    setFetchError(error ?? packError ?? "فشل الاستيراد");
  };

  const handleApplyScoped = async () => {
    const targetTrimmed = targetInput.trim();
    const urlTrimmed = urlInput.trim();
    if (!targetTrimmed && !urlTrimmed) {
      setFetchError("اكتب اسم العنصر المستهدف أو الصق رابط UIverse.");
      return;
    }

    const effectiveTarget = targetTrimmed || "بطاقة الراديو";
    const preview = resolveUiverseTargetFromText(effectiveTarget, {
      urlHint: urlTrimmed || undefined,
      allowDefault: true,
    });
    if (!preview.target) {
      setFetchError(preview.error ?? "عنصر غير معروف.");
      return;
    }

    setApplying(true);
    setFetchError(null);

    let css = fetchedCss?.css ?? "";
    if (!css.trim()) {
      const { result, error } = await fetchUiverseCssFromUrl(urlTrimmed);
      if (!result?.css) {
        setApplying(false);
        setFetchError(error ?? "اجلب CSS من UIverse أولًا.");
        return;
      }
      css = result.css;
      setFetchedCss(result);
    }

    const applied = applyUiverseCssToTarget(
      css,
      effectiveTarget,
      urlTrimmed,
      { allowDefault: true },
    );
    setApplying(false);

    if (!applied.ok) {
      setFetchError(applied.error ?? "فشل التطبيق.");
      return;
    }

    refreshScopedApplies();
    setFetchSuccess(
      `✅ طُبّق على «${applied.target?.labelAr}» فقط — ${applied.parsed?.summaryAr ?? ""}`,
    );
  };

  const handleResetScoped = () => {
    resetUiverseScopedStyle();
    refreshScopedApplies();
    setFetchedCss(null);
    setFetchSuccess("↩️ تمت إعادة المظهر الافتراضي للعناصر المستهدفة.");
    setFetchError(null);
  };

  const targetPreview = useMemo(() => {
    const text = targetInput.trim() || "بطاقة الراديو";
    return resolveUiverseTargetFromText(text, {
      urlHint: urlInput.trim() || undefined,
      allowDefault: Boolean(fetchedCss || urlInput.trim()),
    });
  }, [targetInput, urlInput, fetchedCss]);

  const sampleUrls = useMemo(
    () =>
      BUILTIN_DESIGN_IMPORT_PACKS.filter((p) => p.bundlePath)
        .slice(0, 2)
        .map((p) => resolvePublicImportUrl(p.bundlePath!)),
    [],
  );

  return (
    <div className="space-y-3" dir="rtl">
      <div className="p-3 rounded-2xl lamma-section-card border border-violet-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={13} className="text-violet-300 shrink-0" />
          <div className="text-[10px] font-black text-violet-200">
            مكتبة الثيمات — معاينة معزولة ثم تطبيق
          </div>
        </div>
        <p className="text-[8px] text-gray-400 font-bold leading-relaxed">
          اختر ثيمًا لترى ألوانه وبطاقاته بشكل مستقل — بدون ألوان الموقع الحالية.
          بعد الرضا اضغط «معاينة على الموقع».
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_220px] gap-3">
        <div className="space-y-3 min-w-0">
          <div className="flex gap-1 p-1 rounded-xl lamma-section-card overflow-x-auto">
            {CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2 py-1 rounded-lg text-[8px] font-black shrink-0 transition-all ${
                  category === cat
                    ? "lamma-accent-btn text-white"
                    : "lamma-tab-soft hover:text-white"
                }`}
              >
                {DESIGN_IMPORT_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[220px] overflow-y-auto pr-0.5">
            {categoryPacks.map((pack) => (
              <ImportPackCard
                key={pack.id}
                pack={pack}
                isSelected={selectedPack?.id === pack.id}
                isPending={pendingPackId === pack.id}
                isActive={activePackId === pack.id}
                onSelect={() => setSelectedPack(pack)}
              />
            ))}
          </div>

          {categoryPacks.length === 0 && (
            <p className="text-center text-[9px] text-gray-500 font-bold py-3">
              لا توجد packs — جرّب استيراد رابط JSON.
            </p>
          )}

          <div className="p-2.5 rounded-xl lamma-section-card space-y-2">
            <div className="text-[9px] font-black text-cyan-300 flex items-center gap-1">
              <Globe size={11} />
              جلب ذكي من UIverse — تطبيق على عنصر واحد فقط
            </div>
            <p className="text-[7px] text-gray-500 font-bold leading-relaxed">
              الصق رابط UIverse، حدّد العنصر (فقاعات الشات، الأزرار، الخلفية…)،
              ثم «تطبيق». لن يُمسّ بقية الموقع — و«إعادة تعيين» يلغي أي خطأ.
            </p>
            <div className="flex gap-1.5">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://uiverse.io/0x-Sarthak/hungry-penguin-30"
                className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-[9px] font-bold bg-black/30 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400/40"
                dir="ltr"
              />
              <button
                type="button"
                disabled={fetching || !urlInput.trim()}
                onClick={() => void handleFetchUrl()}
                className="shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-black lamma-accent-btn disabled:opacity-50 flex items-center gap-1"
              >
                {fetching ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Download size={11} />
                )}
                جلب
              </button>
            </div>
            <div className="flex gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Target
                  size={10}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-violet-400/70 pointer-events-none"
                />
                <input
                  type="text"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  placeholder="العنصر المستهدف: فقاعات الشات، الأزرار، الخلفية…"
                  className="w-full pr-7 pl-2 py-1.5 rounded-lg text-[9px] font-bold bg-black/30 border border-violet-500/25 text-white placeholder:text-gray-500 focus:outline-none focus:border-violet-400/50"
                />
              </div>
              <button
                type="button"
                disabled={
                  applying ||
                  (!targetInput.trim() && !urlInput.trim()) ||
                  (!fetchedCss && !urlInput.trim())
                }
                onClick={() => void handleApplyScoped()}
                className="shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-black bg-violet-600/80 hover:bg-violet-500/90 text-white disabled:opacity-50 flex items-center gap-1 border border-violet-400/30"
              >
                {applying ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Wand2 size={11} />
                )}
                تطبيق
              </button>
              <button
                type="button"
                disabled={scopedApplies.length === 0}
                onClick={handleResetScoped}
                className="shrink-0 px-2.5 py-1.5 rounded-lg text-[9px] font-black lamma-tab-soft hover:text-white disabled:opacity-40 flex items-center gap-1 border border-white/10"
                title="إعادة المظهر الافتراضي"
              >
                <RotateCcw size={11} />
                Reset
              </button>
            </div>
            {targetPreview && (
              <p className="text-[7px] text-violet-300/80 font-bold">
                {targetPreview.target?.labelAr ?? targetPreview.error}
              </p>
            )}
            {fetchedCss && (
              <p className="text-[7px] text-cyan-400/90 font-bold">
                CSS جاهز ({fetchedCss.css.length.toLocaleString()} حرف) — من{" "}
                {fetchedCss.source}
              </p>
            )}
            {scopedApplies.length > 0 && (
              <div className="text-[7px] text-emerald-400/90 font-bold space-y-0.5">
                <div>مطبّق حاليًا على:</div>
                {scopedApplies.slice(0, 4).map((a) => (
                  <div key={a.styleId}>• {a.targetLabel}</div>
                ))}
              </div>
            )}
            {fetchError && (
              <p className="text-[8px] font-bold text-red-400">{fetchError}</p>
            )}
            {fetchSuccess && (
              <p className="text-[8px] font-bold text-emerald-400">{fetchSuccess}</p>
            )}
            {sampleUrls.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUrlInput(u)}
                className="block w-full text-left truncate text-[7px] text-cyan-500/80 hover:text-cyan-300"
                dir="ltr"
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {fetchedCss ? (
          <UiverseCssPreview
            result={fetchedCss}
            targetLabel={targetPreview?.target?.labelAr ?? null}
          />
        ) : (
          <ThemePackSandbox
            pack={selectedPack}
            isPending={Boolean(selectedPack && pendingPackId === selectedPack.id)}
            onApplyToSite={
              selectedPack ? () => onApplyToSite(selectedPack) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
