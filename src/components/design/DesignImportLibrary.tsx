import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Globe, Loader2, Sparkles } from "lucide-react";
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
import { ThemePackSandbox } from "./ThemePackSandbox";

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
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState<string | null>(null);

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

  const handleFetchUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setFetching(true);
    setFetchError(null);
    setFetchSuccess(null);
    const { pack, error } = await fetchDesignPackFromUrl(trimmed);
    setFetching(false);
    if (error || !pack) {
      setFetchError(error ?? "فشل الاستيراد");
      return;
    }
    const next = addImportedDesignPack(pack);
    setImported(next);
    setSelectedPack(pack);
    setFetchSuccess(`✅ تم استيراد «${pack.title}»`);
  };

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
              استيراد من UIverse / رابط JSON
            </div>
            <div className="flex gap-1.5">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://uiverse.io/… أو theme.json"
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

        <ThemePackSandbox
          pack={selectedPack}
          isPending={Boolean(selectedPack && pendingPackId === selectedPack.id)}
          onApplyToSite={
            selectedPack ? () => onApplyToSite(selectedPack) : undefined
          }
        />
      </div>
    </div>
  );
}
