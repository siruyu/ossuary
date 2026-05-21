"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Database,
  FolderHeart,
  Code2,
  Bell,
  Terminal,
  Settings,
  Plus,
  Lock,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import SignInButton from "./SignInButton";

const PROTECTED_ROUTES = ["/ritual", "/necromancer", "/repository", "/notifications", "/settings"];

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [cpuLoad, setCpuLoad] = useState(47);
  const [redirecting, setRedirecting] = useState(false);

  // Simulate CPU fluctuation - must be before any conditional returns
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuLoad(Math.floor(Math.random() * 30) + 30);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auth guard - redirect unauthenticated users away from protected routes
  useEffect(() => {
    if (status === "loading" || redirecting) return;

    const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

    if (!session && isProtectedRoute) {
      setRedirecting(true);
      router.replace("/login");
    } else if (session && pathname === "/login") {
      router.replace("/");
    }
  }, [pathname, session, status, router, redirecting]);

  
  useEffect(() => {
    if (status !== "loading") return;
    
    const timeout = setTimeout(() => {
      window.location.reload();
    }, 5000);

    return () => clearTimeout(timeout);
  }, [status]);

  // Show loading while checking auth only for protected routes
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  
  if (status === "loading" && isProtectedRoute) {
    return (
      <div className="h-screen bg-ossuary-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-[11px] text-ossuary-grey tracking-widest uppercase animate-pulse mb-2">
            AUTHENTICATING_IDENTITY...

            
          </div>
          <div className="w-48 h-1 bg-ossuary-border">
            <div className="h-full bg-ossuary-yellow animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    );
  }

  // Show lock screen for protected routes without auth
  if (!session && isProtectedRoute) {
    return (
      <div className="h-screen bg-ossuary-black flex items-center justify-center">
        <div className="text-center border border-ossuary-border p-8 max-w-md">
          <Lock size={48} className="text-ossuary-yellow/50 mx-auto mb-4" />
          <div className="text-[11px] text-ossuary-grey tracking-widest uppercase mb-2">
            RESTRICTED_ACCESS_DETECTED
          </div>
          <div className="text-[9px] text-ossuary-greyDark tracking-wider mb-4">
            AUTHENTICATION_REQUIRED_FOR_THIS_SECTOR
          </div>
          <Link
            href="/login"
            className="inline-block bg-ossuary-yellow text-ossuary-black text-[10px] font-bold px-6 py-3 tracking-wider hover:bg-ossuary-yellow/80 transition-colors"
          >
            AUTHENTICATE_NOW
          </Link>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      href: "/",
      label: "THE_MAUSOLEUM",
      icon: Database,
    },
    {
      href: "/ritual",
      label: "THE_RITUAL",
      icon: Terminal,
    },
    {
      href: "/necromancer",
      label: "THE_NECROMANCER",
      icon: FolderHeart,
    },
    {
      href: "/repository",
      label: "THE_REPOSITORY",
      icon: Code2,
    },
  ];

  return (
    <div className="h-screen bg-ossuary-black text-ossuary-white flex overflow-hidden">
      {/* Fixed Sidebar */}
      <aside className="w-64 h-full border-r border-ossuary-border flex flex-col flex-shrink-0 bg-[#060606] overflow-y-auto overflow-x-hidden">
        {/* System header */}
        <div className="p-4 border-b border-ossuary-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] tracking-wider text-ossuary-grey uppercase">
              NODE_IDENTIFIER
            </span>
          </div>
          <div className="mt-1 font-bold text-sm tracking-widest">
            OSSARY_ROOT
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 flex-shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 text-[11px] tracking-wider font-medium transition-colors ${
                  isActive
                    ? "bg-ossuary-yellow text-ossuary-black"
                    : "text-ossuary-grey hover:text-ossuary-white hover:bg-ossuary-panel"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-ossuary-border mt-auto flex-shrink-0">
          {/* Settings link */}
          <div className="py-3 px-4">
            <Link
              href="/settings"
              className="flex items-center gap-3 text-[11px] text-ossuary-grey hover:text-ossuary-white cursor-pointer py-2 transition-colors"
            >
              <Settings size={16} />
              <span className="tracking-wider">SETTINGS</span>
            </Link>
          </div>

          {/* Rest in Pieces button */}
          <RestInPiecesButtonInner />

          {/* CPU Load */}
          <div className="p-4 border-t border-ossuary-border">
            <div className="flex items-center justify-between text-[10px] text-ossuary-grey uppercase tracking-wider mb-2">
              <span>CPU_LOAD</span>
              <span>{cpuLoad}%</span>
            </div>
            <div className="w-full h-1 bg-ossuary-border">
              <div
                className="h-full bg-ossuary-yellow transition-all duration-1000"
                style={{ width: `${cpuLoad}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Fixed Top header bar */}
        <header className="h-14 border-b border-ossuary-border flex items-center justify-between px-6 bg-[#060606] flex-shrink-0">
          <div className="flex items-center gap-6">
            <span className="text-ossuary-yellow font-bold text-sm tracking-wider">
              PROJECT_GRAVEYARD.SYS
            </span>
            <Link
              href="/"
              className={`text-[11px] tracking-wider uppercase transition-colors ${
                pathname === "/"
                  ? "text-ossuary-white border-b border-ossuary-white pb-0.5"
                  : "text-ossuary-grey hover:text-ossuary-white"
              }`}
            >
              MAUSOLEUM
            </Link>
            <Link
              href="/ritual"
              className={`text-[11px] tracking-wider uppercase transition-colors ${
                pathname === "/ritual"
                  ? "text-ossuary-white border-b border-ossuary-white pb-0.5"
                  : "text-ossuary-grey hover:text-ossuary-white"
              }`}
            >
              RITUAL
            </Link>
            <Link
              href="/necromancer"
              className={`text-[11px] tracking-wider uppercase transition-colors ${
                pathname === "/necromancer"
                  ? "text-ossuary-white border-b border-ossuary-white pb-0.5"
                  : "text-ossuary-grey hover:text-ossuary-white"
              }`}
            >
              NECROMANCER
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/notifications"
              className="text-ossuary-grey hover:text-ossuary-white transition-colors cursor-pointer relative"
            >
              <Bell size={16} />
            </Link>
            <SignInButton />
          </div>
        </header>

        {/* Scrollable content area */}
        <main className="flex-1 bg-grid-pattern overflow-y-auto overflow-x-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>{children}</main>

        {/* Ruler line at bottom */}
        <div className="flex-shrink-0">
          <div className="ruler-line" />
        </div>
      </div>
    </div>
  );
}

function RestInPiecesButtonInner() {
  const { data: session, status } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);

  const fetchUserImage = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`/api/profile?userId=${encodeURIComponent(session.user.id)}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUserImage(data.image);
      }
    } catch {
      // ignore
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchUserImage();
  }, [fetchUserImage]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string | null;
      setUserImage(detail);
    };
    window.addEventListener("avatar-updated", handler);
    return () => window.removeEventListener("avatar-updated", handler);
  }, []);

  if (status === "loading") {
    return (
      <div className="p-3 border-t border-ossuary-border">
        <div className="w-full bg-ossuary-border/20 text-ossuary-border text-[11px] font-bold tracking-wider py-3 flex items-center justify-center gap-2 uppercase animate-pulse">
          <Plus size={14} />
          REST_IN_PIECES
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-3 border-t border-ossuary-border">
        <Link href="/login" className="w-full block bg-ossuary-yellow text-ossuary-black text-[11px] font-bold tracking-wider py-3 flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors uppercase">
          <Plus size={14} />
          REST_IN_PIECES
        </Link>
      </div>
    );
  }

  const initials = session.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <div className="p-3 border-t border-ossuary-border space-y-2">
      {/* User mini-profile */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-6 h-6 bg-ossuary-yellow text-ossuary-black flex items-center justify-center text-[8px] font-bold rounded-sm flex-shrink-0">
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <span className="text-[10px] text-ossuary-grey truncate">
          {session.user?.name || session.user?.email}
        </span>
      </div>
      {/* Sign out button */}
      <button
        onClick={async () => {
          setSigningOut(true);
          await signOut({ redirect: true, callbackUrl: "/login" });
        }}
        disabled={signingOut}
        className="w-full bg-red-900/30 border border-red-800/40 text-red-400 text-[10px] font-bold tracking-wider py-2 flex items-center justify-center gap-2 hover:bg-red-900/50 hover:text-red-300 transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={12} />
        {signingOut ? "SEVERING..." : "REST_IN_PIECES"}
      </button>
    </div>
  );
}
