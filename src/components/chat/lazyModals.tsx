import React, {
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from "react";

type ModalModule = Record<string, ComponentType<Record<string, unknown>>>;

function lazyModal(
  importer: () => Promise<ModalModule>,
  exportName: string,
): LazyExoticComponent<ComponentType<Record<string, unknown>>> {
  return lazy(async () => {
    const mod = await importer();
    const component = mod[exportName];
    if (!component) {
      throw new Error(`Missing export ${exportName}`);
    }
    return { default: component };
  });
}

export const LazyOwnerPanelModal = lazyModal(
  () => import("../modals/OwnerPanelModal") as unknown as Promise<ModalModule>,
  "OwnerPanelModal",
);
export const LazyOwnerRoleManagementPanel = lazyModal(
  () =>
    import("../modals/OwnerRoleManagementPanel") as unknown as Promise<ModalModule>,
  "OwnerRoleManagementPanel",
);
export const LazyAdminPanelModal = lazyModal(
  () => import("../modals/AdminPanelModal") as unknown as Promise<ModalModule>,
  "AdminPanelModal",
);
export const LazyGuardPanelModal = lazyModal(
  () => import("../modals/GuardPanelModal") as unknown as Promise<ModalModule>,
  "GuardPanelModal",
);
export const LazyStorePanelModal = lazyModal(
  () => import("../modals/StorePanelModal") as unknown as Promise<ModalModule>,
  "StorePanelModal",
);
export const LazyOwnerStorePanelModal = lazyModal(
  () => import("../modals/OwnerStorePanelModal") as unknown as Promise<ModalModule>,
  "OwnerStorePanelModal",
);
export const LazyDesignCenterModal = lazyModal(
  () => import("../modals/DesignCenterModal") as unknown as Promise<ModalModule>,
  "DesignCenterModal",
);
export const LazyStatsModal = lazyModal(
  () => import("../modals/StatsModal") as unknown as Promise<ModalModule>,
  "StatsModal",
);
export const LazyUserProfileModal = lazyModal(
  () => import("../modals/UserProfileModal") as unknown as Promise<ModalModule>,
  "UserProfileModal",
);

export function ModalSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 text-xs text-gray-300">
          جاري التحميل…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
