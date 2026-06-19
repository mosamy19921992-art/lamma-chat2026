import React from "react";
import { Flame, MessageCircle, Users } from "lucide-react";

export type MobileNavId = "chat" | "members" | "private";

interface MobileBottomNavProps {
  active: MobileNavId;
  onNavigate: (tab: MobileNavId) => void;
  hasPmActivity?: boolean;
}

const tabs: {
  id: MobileNavId;
  label: string;
  Icon: typeof Flame;
}[] = [
  { id: "chat", label: "العام", Icon: Flame },
  { id: "members", label: "المتصلين", Icon: Users },
  { id: "private", label: "الخاص", Icon: MessageCircle },
];

export function MobileBottomNav({
  active,
  onNavigate,
  hasPmActivity = false,
}: MobileBottomNavProps) {
  return (
    <nav
      className="lamma-pwa-bottom-nav md:hidden"
      aria-label="التنقل الرئيسي"
      role="navigation"
    >
      <div className="lamma-pwa-bottom-nav-inner">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          const { Icon } = tab;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onNavigate(tab.id)}
              className={`lamma-pwa-bottom-nav-item ${isActive ? "lamma-pwa-bottom-nav-item-active" : ""}`}
            >
              <span className="lamma-pwa-bottom-nav-icon">
                <Icon size={22} strokeWidth={2.15} aria-hidden />
                {tab.id === "private" && hasPmActivity ? (
                  <span className="lamma-pwa-bottom-nav-dot" aria-hidden />
                ) : null}
              </span>
              <span className="lamma-pwa-bottom-nav-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileBottomNav;
