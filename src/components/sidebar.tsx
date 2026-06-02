"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Crosshair,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Zap,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavModule {
  key: string;
  label: string;
  icon: LucideIcon;
  basePath: string;
  color: string;
  gradient: string;
  children: NavItem[];
}

const modules: NavModule[] = [
  {
    key: "main",
    label: "Lead Engine",
    icon: Zap,
    basePath: "/",
    color: "text-indigo-500",
    gradient: "from-indigo-500 to-violet-500",
    children: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/campaigns", label: "Campaigns", icon: Crosshair },
      { href: "/leads", label: "All Leads", icon: Users },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({
    main: true,
  });

  const toggleModule = (key: string) => {
    if (collapsed) return;
    setOpenModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border dark:border-white/5 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl transition-all duration-300 ease-in-out relative z-10",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Brand */}
      <div className="flex h-20 shrink-0 items-center gap-4 border-b border-border dark:border-white/5 px-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/30">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col truncate">
            <span className="text-xl font-black text-foreground tracking-tight">
              SENTRA
            </span>
            <span className="text-xs text-indigo-500 font-bold uppercase tracking-wider">
              LeadGen AI
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {modules.map((mod) => {
          const isModuleActive =
            mod.basePath === "/"
              ? true
              : pathname.startsWith(mod.basePath);
          const isOpen = openModules[mod.key] ?? false;

          return (
            <div key={mod.key}>
              <button
                onClick={() => toggleModule(mod.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                  isModuleActive
                    ? "bg-primary/8 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <mod.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    isModuleActive ? mod.color : ""
                  )}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{mod.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                        isOpen ? "rotate-0" : "-rotate-90"
                      )}
                    />
                  </>
                )}
              </button>

              <AnimatePresence initial={false}>
                {isOpen && !collapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-border pl-3">
                      {mod.children.map((child) => {
                        const isActive =
                          pathname === child.href ||
                          (child.href !== "/" &&
                            pathname.startsWith(child.href));

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                              isActive
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                          >
                            <child.icon
                              className={cn(
                                "h-[15px] w-[15px] shrink-0",
                                isActive ? "text-primary" : ""
                              )}
                            />
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Settings */}
        <div className="pt-2">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
              pathname === "/settings"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Settings
              className={cn(
                "h-[18px] w-[18px] shrink-0",
                pathname === "/settings" ? "text-primary" : ""
              )}
            />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>

        {/* Logout */}
        <div className="pt-2">
          <button
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 text-red-500 hover:bg-red-500/10"
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-3 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-[18px] w-[18px] shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
