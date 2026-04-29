import { useNavigate, useLocation } from "react-router-dom";
import { Home, Dumbbell, FolderOpen, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Custom event used to open the existing hamburger drawer (which holds
 * profile/account items). Listened to by AppHeader.
 */
export const OPEN_PROFILE_DRAWER_EVENT = "fitai:open-profile-drawer";

const HIDE_ROUTES = ["/auth"];

export default function BottomNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();
  const { lang } = useLanguage();

  if (!user) return null;
  if (HIDE_ROUTES.includes(loc.pathname)) return null;

  const t = (id: string, en: string, zh: string) =>
    lang === "id" ? id : lang === "zh" ? zh : en;

  const items = [
    { key: "home",   path: "/",            icon: Home,       label: t("Home", "Home", "首页") },
    { key: "prog",   path: "/programs",    icon: Dumbbell,   label: t("Program", "Program", "计划") },
    { key: "saved",  path: "/saved-plans", icon: FolderOpen, label: t("Rencana", "Plans", "我的") },
    // Profile lives inside the existing hamburger drawer — open it via event.
    { key: "profile",path: "__drawer__",   icon: User,       label: t("Profil", "Profile", "我") },
  ];

  const isActive = (path: string) => {
    if (path === "__drawer__") return false;
    if (path === "/") return loc.pathname === "/";
    return loc.pathname === path || loc.pathname.startsWith(path + "/");
  };

  const handleClick = (path: string) => {
    if (path === "__drawer__") {
      window.dispatchEvent(new CustomEvent(OPEN_PROFILE_DRAWER_EVENT));
      return;
    }
    nav(path);
  };

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-30 backdrop-blur-md"
      style={{
        background: "hsl(var(--surface) / 0.92)",
        borderTop: "0.5px solid hsl(var(--border) / 0.12)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label="Bottom navigation"
    >
      <ul className="flex items-stretch justify-around h-14">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(it.path);
          return (
            <li key={it.key} className="flex-1">
              <button
                onClick={() => handleClick(it.path)}
                className="w-full h-full flex flex-col items-center justify-center gap-0.5 transition-colors"
                style={{ color: active ? "#ff6b00" : undefined }}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: active ? "#ff6b00" : "hsl(var(--muted-foreground))" }}
                />
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: active ? "#ff6b00" : "hsl(var(--muted-foreground))" }}
                >
                  {it.label}
                </span>
                <span
                  className="block rounded-full"
                  style={{
                    width: 4,
                    height: 4,
                    marginTop: 1,
                    background: active ? "#ff6b00" : "transparent",
                  }}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}