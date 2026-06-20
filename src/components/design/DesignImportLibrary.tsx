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

interface DesignImportLibraryProps {
  onPreviewPack: (pack: DesignImportPack) => void;
  pendingPackId?: string | null;
  activePackId?: string | null;
}

function ImportPackCard({
  pack,
  isPending,
  isActive,
  onPreview,
  onSave,
  showSave,
}: {
  pack: DesignImportPack;
  isPending?: boolean;
  isActive?: boolean;
  onPreview: () => void;
  onSave?: () => void;
  showSave?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPreview}
      className={`group relative overflow-hidden rounded-2xl border text-right transition-all duration-200 w-full ${
        isPending
          ? "border-amber-400/65 ring-2 ring-amber-400/40"
          : isActive
            ? "border-emerald-400/55 ring-1 ring-emerald-400/35"
            : "border-white/10 hover:border-emerald-400/45"
      }`}
    >
      <div
        className="relative h-[68px] w-full overflow-hidden"
        style={{ background: pack.previewGradient }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {pack.sourceUrl && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[7px] font-black bg-black/50 text-cyan-200 border border-cyan-400/30 flex items-center gap-0.5">
            <Globe size={8} />
            مستورد
          </span>
        )}
        {isPending && (
          <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md text-[7px] font-black bg-amber-500/90 text-black">
            معاينة
          </span>
        )}
      </div>
      <div className="p-2.5 bg-white/[0.06] border-t border-white/8">
        <div className="text-[10px] font-black text-white truncate">
          {pack.emoji} {pack.title}
        </div>
        <div className="text-[8px] text-gray-400 font-bold mt-0.5 line-clamp-2 leading-relaxed">
          {pack.subtitle}
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {pack.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded-md text-[7px] font-bold bg-white/5 text-gray-400 border border-white/8"
            >
              {tag}
            </span>
          ))}
        </div>
        {showSave && onSave && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            className="mt-2 w-full py-1.5 rounded-lg text-[8px] font-black lamma-tab-soft flex items-center justify-center gap-1"
          >
            <Download size={10} />
            حفظ في المكتبة
          </button>
        )}
      </div>
    </button>
  );
}

export function DesignImportLibrary({
  onPreviewPack,
  pendingPackId,
  activePackId,
}: DesignImportLibraryProps) {
  const [category, setCategory] = useState<DesignImportCategory>("ios");
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
    setFetchSuccess(`✅ تم استيراد «${pack.title}» — اضغط للمعاينة`);
    onPreviewPack(pack);
  };

  const sampleUrls = useMemo(
    () =>
      BUILTIN_DESIGN_IMPORT_PACKS.filter((p) => p.bundlePath).slice(0, 2).map((p) =>
        resolvePublicImportUrl(p.bundlePath!),
      ),
    [],
  );

  return (
    <div className="space-y-4" dir="rtl">
      <div className="p-4 rounded-2xl lamma-section-card border border-violet-500/25 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-300 shrink-0" />
          <div className="text-[11px] font-black text-violet-200">
            مكتبة الثيمات — iOS · زجاج · أعمدة · استيراد من النت
          </div>
        </div>
        <p className="text-[9px] text-gray-400 font-bold leading-relaxed">
          اختر pack جاهز أو الصق رابط JSON (https) — يطبّق فورم الزجاج + شكل البطاقات +
          الألوان مع معاينة حية.
        </p>
      </div>

      <div className="p-3 rounded-2xl lamma-section-card space-y-2">
        <div className="text-[10px] font-black text-cyan-300 flex items-center gap-1.5">
          <Globe size={12} />
          استيراد من رابط
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/my-theme.json"
            className="flex-1 min-w-0 px-3 py-2 rounded-xl text-[10px] font-bold bg-black/30 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400/40"
            dir="ltr"
          />
          <button
            type="button"
            disabled={fetching || !urlInput.trim()}
            onClick={() => void handleFetchUrl()}
            className="shrink-0 px-4 py-2 rounded-xl text-[10px] font-black lamma-accent-btn disabled:opacity-50 flex items-center gap-1"
          >
            {fetching ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            جلب
          </button>
        </div>
        {fetchError && (
          <p className="text-[9px] font-bold text-red-400">{fetchError}</p>
        )}
        {fetchSuccess && (
          <p className="text-[9px] font-bold text-emerald-400">{fetchSuccess}</p>
        )}
        <div className="text-[8px] text-gray-500 font-bold space-y-0.5">
          <div>روابط جاهزة على موقعك:</div>
          {sampleUrls.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUrlInput(u)}
              className="block w-full text-left truncate text-cyan-500/80 hover:text-cyan-300 underline-offset-2 hover:underline"
              dir="ltr"
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-2xl lamma-section-card overflow-x-auto">
        {(Object.keys(DESIGN_IMPORT_CATEGORY_LABELS) as DesignImportCategory[]).map(
          (cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black shrink-0 transition-all ${
                category === cat
                  ? "lamma-accent-btn text-white"
                  : "lamma-tab-soft hover:text-white"
              }`}
            >
              {DESIGN_IMPORT_CATEGORY_LABELS[cat]}
            </button>
          ),
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {categoryPacks.map((pack) => (
          <ImportPackCard
            key={pack.id}
            pack={pack}
            isPending={pendingPackId === pack.id}
            isActive={activePackId === pack.id}
            onPreview={() => onPreviewPack(pack)}
            showSave={Boolean(pack.sourceUrl)}
            onSave={() => {
              addImportedDesignPack(pack);
              refreshImported();
            }}
          />
        ))}
      </div>

      {categoryPacks.length === 0 && (
        <p className="text-center text-[10px] text-gray-500 font-bold py-4">
          لا توجد packs في هذا التصنيف — جرّب استيراد رابط JSON.
        </p>
      )}
    </div>
  );
}
