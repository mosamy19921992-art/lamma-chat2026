import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  BUILTIN_DESIGN_IMPORT_PACKS,
  DESIGN_IMPORT_CATEGORY_LABELS,
  type DesignImportCategory,
  type DesignImportPack,
  getImportPacksByCategory,
} from "../../services/design/designImportCatalog";
import { loadImportedDesignPacks } from "../../services/design/designNetImportService";
import { ThemePackSandbox } from "./ThemePackSandbox";

interface DesignImportLibraryProps {
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
      className={`relative rounded-xl border overflow-hidden text-right transition-all w-full ${
        isSelected
          ? "border-cyan-400/70 ring-2 ring-cyan-500/30 scale-[1.02]"
          : "border-white/10 hover:border-white/25"
      }`}
      style={{ background: pack.previewGradient ?? "rgba(18,24,32,0.8)" }}
    >
      {(isPending || isActive) && (
        <span
          className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[7px] font-black ${
            isPending ? "bg-amber-500/90 text-black" : "bg-emerald-500/90 text-black"
          }`}
        >
          {isPending ? "معاينة" : "مطبّق"}
        </span>
      )}
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
          اختر ثيمًا لترى ألوانه وبطاقاته — بعد الرضا اضغط «معاينة على الموقع».
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[260px] overflow-y-auto pr-0.5">
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
            <p className="text-center text-[9px] text-gray-500 font-bold py-4">
              لا توجد ثيمات في هذه الفئة.
            </p>
          )}
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
