"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import {
  User,
  Code2,
  Save,
  Trash2,
  Eye,
  ChevronDown,
  AlertTriangle,
  LogIn,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Not-logged-in gate
// ---------------------------------------------------------------------------

function NotLoggedIn() {
  return (
    <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center bg-[#060606]">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 border-2 border-ossuary-border flex items-center justify-center">
            <ShieldAlert size={36} className="text-ossuary-greyDark" />
          </div>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-ossuary-white mb-3">
          ACCESS_DENIED
        </h2>
        <p className="text-[11px] text-ossuary-grey tracking-wider mb-8 leading-relaxed">
          AUTHENTICATION REQUIRED TO MANAGE SETTINGS. ESTABLISH A SESSION
          TO CONFIGURE YOUR NECROMANCER PROFILE.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-ossuary-yellow text-ossuary-black text-[11px] font-bold tracking-wider px-8 py-3 hover:bg-yellow-400 transition-colors uppercase"
        >
          <LogIn size={14} />
          INITIALIZE_SESSION
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function Toggle({
  label,
  active,
  onChange,
}: {
  label: string;
  active: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-ossuary-border/40 last:border-b-0">
      <span className="text-[11px] tracking-wider text-ossuary-greyText uppercase">
        {label}
      </span>
      <button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-sm transition-colors ${
          active ? "bg-ossuary-yellow" : "bg-ossuary-border"
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-sm transition-all ${
            active
              ? "left-6 bg-ossuary-black"
              : "left-0.5 bg-ossuary-greyDark"
          }`}
        />
      </button>
    </div>
  );
}

function StatBox({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-[#0A0A0A] border border-ossuary-border p-3 text-center flex-1 min-w-0">
      <div
        className={`text-2xl font-black ${accent ? "text-ossuary-yellow" : "text-ossuary-white"}`}
      >
        {value}
      </div>
      <div className="text-[9px] text-ossuary-greyDark tracking-wider uppercase mt-1">
        {label}
      </div>
    </div>
  );
}

function Swatch({
  color,
  label,
  active,
  onClick,
}: {
  color: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-2 border transition-all ${
        active
          ? "border-ossuary-yellow bg-ossuary-yellow/5"
          : "border-ossuary-border hover:border-ossuary-borderLight"
      }`}
    >
      <div
        className="w-8 h-8 border border-ossuary-border/60"
        style={{ backgroundColor: color }}
      />
      <span
        className={`text-[9px] tracking-wider ${
          active ? "text-ossuary-yellow font-bold" : "text-ossuary-greyDark"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProfileData {
  uid: string;
  name: string | null;
  displayName: string;
  email: string | null;
  image: string | null;
  title: string;
  level: number;
  rank: string;
  totalBuried: number;
  lootedResources: number;
  bio: string;
  masteryTags: string[];
  systemInsight: string;
  systemWhispers: boolean;
}

interface AlertPrefs {
  systemWhispers: boolean;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ConfigNecromancer() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const userId = session?.user?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Display name (editable)
  const [name, setName] = useState("");
  // Public title (editable)
  const [title, setTitle] = useState("");
  // Bio (editable)
  const [bio, setBio] = useState("");

  // GitHub connection state
  const [githubConnected, setGithubConnected] = useState(false);
  // Archive depth state
  const [archiveSize, setArchiveSize] = useState("0 KB");
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);

  // Fetch GitHub connection status
  const fetchGithubStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/github/status");
      if (res.ok) {
        const data = await res.json();
        setGithubConnected(data.hasGitHubAuth);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch archive depth (total size of buried repos)
  const fetchArchiveDepth = useCallback(async () => {
    if (!userId) return;
    setIsLoadingArchive(true);
    try {
      const res = await fetch(`/api/burial/archive-size?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setArchiveSize(data.formattedSize);
      } else {
        setArchiveSize("--");
      }
    } catch {
      setArchiveSize("--");
    } finally {
      setIsLoadingArchive(false);
    }
  }, [userId]);

  // Alert prefs - notifications enabled by default
  const [alerts, setAlerts] = useState<AlertPrefs>({
    systemWhispers: true,
  });

  // Load systemWhispers from profile when fetched
  useEffect(() => {
    if (profile?.systemWhispers !== undefined) {
      setAlerts((prev) => ({ ...prev, systemWhispers: profile.systemWhispers }));
    }
  }, [profile?.systemWhispers]);

  // Visual theme from ThemeProvider
  const { theme, setTheme, fontFamily, setFontFamily, accentColor, setAccentColor } = useTheme();
  const [activeColor, setActiveColor] = useState(accentColor);

  // Sync local state with theme when theme loads
  useEffect(() => {
    setActiveColor(accentColor);
  }, [accentColor]);

  const handleColorChange = (color: string) => {
    setActiveColor(color);
    setAccentColor(color);
  };

  const loggedIn = status === "authenticated" && !!userId;

  // ------------------------------------------------------------------
  // Fetch profile on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!loggedIn) return;

    let cancelled = false;
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/profile?userId=${encodeURIComponent(userId!)}`);
        if (cancelled) return;
        if (res.ok) {
          const data: ProfileData = await res.json();
          setProfile(data);
          setName(data.name || data.displayName);
          setTitle(data.title);
          setBio(data.bio);
          // Fetch GitHub connection status and archive depth
          fetchGithubStatus();
          fetchArchiveDepth();
        }
      } catch {
        // silent fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProfile();
    fetchGithubStatus();
    fetchArchiveDepth();
    return () => { cancelled = true; };
  }, [loggedIn, userId, fetchGithubStatus, fetchArchiveDepth]);

  // ------------------------------------------------------------------
  // Save
  // ------------------------------------------------------------------
  const handleSave = useCallback(async () => {
    if (!userId) return;
    
    setSaving(true);
    setSaved(false);
    
    // Small delay to ensure UI shows "SAVING..." state
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const res = await fetch(`/api/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name,
          title,
          bio,
          systemWhispers: alerts.systemWhispers,
        }),
      });
      
      if (!res.ok) {
        console.error("Save failed:", res.status, res.statusText);
        setSaving(false);
        return;
      }
      
      const data = await res.json();
      // Update local state with returned data to ensure consistency
      setProfile((prev) => prev ? {
        ...prev,
        name: data.name,
        image: data.image,
        bio: data.bio,
        title: data.title,
        systemWhispers: data.systemWhispers,
      } : null);
      
      // Update session with new name and image
      const sessionUpdates: Record<string, string> = {};
      if (data.name !== undefined) {
        sessionUpdates.name = data.name;
      }
      if (data.image !== undefined) {
        sessionUpdates.image = data.image;
      }
      if (Object.keys(sessionUpdates).length > 0) {
        await update(sessionUpdates);
      }
      
      // Force a small delay to allow React to re-render with updated session
      await new Promise(resolve => setTimeout(resolve, 50));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }, [userId, name, title, bio, alerts.systemWhispers]);

  // ------------------------------------------------------------------
  // Avatar upload
  // ------------------------------------------------------------------
  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

      const res = await fetch("/api/avatar", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        
        // Save to user in database first
        const saveRes = await fetch(`/api/profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, image: data.url }),
        });
        
        if (saveRes.ok) {
          // Update the session with new image
          await update({ image: data.url });
          
          // Fetch fresh profile data to ensure consistency
          const profileRes = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`);
          if (profileRes.ok) {
            const freshProfile = await profileRes.json();
            setProfile((prev) => prev ? { ...prev, image: freshProfile.image, name: freshProfile.name } : null);
          }
        }
      }
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [userId]);

  const toggleAlert = () => {
    setAlerts((prev) => ({ systemWhispers: !prev.systemWhispers }));
  };

  const handleDeleteAccount = useCallback(async () => {
    if (!userId || deleting) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await signOut({ callbackUrl: "/login" });
      } else {
        console.error("Delete failed:", res.status, res.statusText);
        setDeleting(false);
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error("Delete error:", err);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [userId, deleting]);

  // ------------------------------------------------------------------
  // Auth gate
  // ------------------------------------------------------------------
  if (!loggedIn) return <NotLoggedIn />;

  // ------------------------------------------------------------------
  // Loading skeleton
  // ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="w-full p-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-16 h-3 bg-ossuary-yellow/20 animate-pulse rounded-sm" />
          <div className="w-64 h-3 bg-ossuary-border animate-pulse rounded-sm" />
        </div>
        <div className="w-72 h-12 bg-ossuary-border animate-pulse rounded-sm mb-2" />
        <div className="w-96 h-4 bg-ossuary-border/40 animate-pulse rounded-sm mb-6" />
        <div className="h-px bg-ossuary-border mb-8" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-ossuary-panel border border-ossuary-border p-6 mb-4">
            <div className="w-40 h-3 bg-ossuary-border animate-pulse rounded-sm mb-4" />
            <div className="space-y-3">
              <div className="w-full h-8 bg-ossuary-border animate-pulse rounded-sm" />
              <div className="w-full h-8 bg-ossuary-border animate-pulse rounded-sm" />
              <div className="w-full h-16 bg-ossuary-border animate-pulse rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="bg-grid-pattern min-h-screen pb-12">
      {/* Page Header */}
      <div className="px-8 pt-8 pb-4">
        {/* Breadcrumb pill + path */}
        <div className="flex items-center gap-3 mb-3">
          <span className="bg-ossuary-yellow text-ossuary-black text-[9px] font-bold px-2 py-0.5 tracking-wider">
            LOCAL_HOST
          </span>
          <span className="text-[10px] text-ossuary-greyDark tracking-wider">
            DIR: /SYS/CONFIG/USER_SETTINGS.CFG
          </span>
        </div>

        {/* Title */}
        <div className="flex items-baseline gap-0 mb-2">
          <span className="text-white font-black text-5xl tracking-tighter">
            CONFIG.
          </span>
          <span className="text-ossuary-yellow font-black text-5xl tracking-tighter">
            NECROMANCER
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-[11px] text-ossuary-greyDark tracking-wider">
          {">"} SYSTEM_PROFILE_V2.4.6 // STABILITY_MODE: NOMINAL
        </p>

        {/* Ruler */}
        <div className="ruler-line mt-6" />
      </div>

      {/* ============================================== */}
      {/* SUBSECTION_01: LOCAL_ACCOUNT (WEBSITE ACCOUNT) */}
      {/* ============================================== */}
      <div className="px-8 mb-4">
        <div className="bg-[#0A0A0A] border border-ossuary-border">
          {/* Section header */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-ossuary-border bg-[#0A0A0A]">
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] tracking-widest text-ossuary-greyDark uppercase font-bold">
                SUBSECTION_01: LOCAL_ACCOUNT
              </h2>
              <span className="text-[9px] text-ossuary-greyDark">(WEBSITE ACCOUNT - INDEPENDENT)</span>
            </div>
            <span className="bg-ossuary-yellow/10 text-ossuary-yellow text-[9px] px-2 py-0.5 font-bold tracking-wider border border-ossuary-yellow/30">
              LEVEL_4_ACCESS
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-6 p-5">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-32 h-32 border border-ossuary-border cursor-pointer group overflow-hidden rounded-full hover:border-ossuary-yellow transition-colors"
              >
                {uploadingAvatar ? (
                  <div className="bg-ossuary-panel flex items-center justify-center">
                    <Upload size={24} className="text-ossuary-yellow animate-pulse" />
                  </div>
                ) : profile?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.image}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="bg-ossuary-panel flex items-center justify-center">
                    <User size={40} className="text-ossuary-greyDark" />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-7 h-7 bg-ossuary-yellow flex items-center justify-center">
                  <Upload size={12} className="text-ossuary-black" />
                </div>
</div>
            </div>

            {/* Form fields */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-[10px] text-ossuary-greyText uppercase tracking-wider mb-1.5 font-semibold">
                  USER_DESIGNATION
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full terminal-input text-[13px]"
                  placeholder="Display name"
                />
              </div>

              <div>
                <label className="block text-[10px] text-ossuary-greyText uppercase tracking-wider mb-1.5 font-semibold">
                  PUBLIC_TITLE
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full terminal-input text-[13px]"
                  placeholder="e.g. SENIOR_EXORCIST"
                />
              </div>

              <div>
                <label className="block text-[10px] text-ossuary-greyText uppercase tracking-wider mb-1.5 font-semibold">
                  MANIFESTO_DATA
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full terminal-input text-[12px] resize-none leading-relaxed"
                  placeholder="Your bio / manifesto..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================== */}
      {/* SUBSECTION_02: ARCHIVE_DEPTH (TOTAL SIZE OF BURIED REPOS) */}
      {/* ============================================== */}
      <div className="px-8 mb-4">
        <div className="bg-[#0A0A0A] border border-ossuary-border">
          {/* Section header */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-ossuary-border">
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] tracking-widest text-ossuary-greyDark uppercase font-bold">
                SUBSECTION_02: ARCHIVE_DEPTH
              </h2>
              <span className="text-[9px] text-ossuary-greyDark">(TOTAL SIZE OF BURIED REPOSITORIES)</span>
            </div>
            <Code2 size={12} className="text-ossuary-greyDark" />
          </div>

          <div className="p-5">
            <p className="text-[10px] text-ossuary-greyDark mb-4">
              {"//"} This displays the cumulative storage size of all repositories buried in your ossuary.
              Connect GitHub to fetch real-time sizes.
            </p>

            {/* Archive Depth Stat */}
            <div className="flex gap-3">
              <StatBox 
                value={archiveSize} 
                label="TOTAL_ARCHIVE_SIZE" 
                accent 
              />
            </div>

            {!githubConnected && (
              <div className="mt-4 text-[9px] text-ossuary-greyDark">
                <a 
                  href="http://localhost:3000/api/connect-github" 
                  className="text-ossuary-yellow hover:underline"
                >
                  Connect GitHub
                </a> 
                {" "}to view actual repository sizes.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================== */}
      {/* SUBSECTION_03 & 04: Two columns */}
      {/* ============================================== */}
      <div className="px-8 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SIGNAL_ALERTS */}
          <div className="bg-[#0A0A0A] border border-ossuary-border">
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-ossuary-border">
              <h2 className="text-[10px] tracking-widest text-ossuary-greyDark uppercase font-bold">
                SUBSECTION_03: SIGNAL_ALERTS
              </h2>
              <Eye size={12} className="text-ossuary-greyDark" />
            </div>
            <div className="px-5 py-2">
              <Toggle
                label="SYSTEM_WHISPERS"
                active={alerts.systemWhispers}
                onChange={toggleAlert}
              />
            </div>
          </div>

          {/* VISUAL_SPECTRUM */}
          <div className="bg-[#0A0A0A] border border-ossuary-border">
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-ossuary-border">
              <h2 className="text-[10px] tracking-widest text-ossuary-greyDark uppercase font-bold">
                SUBSECTION_04: VISUAL_SPECTRUM
              </h2>
              <Eye size={12} className="text-ossuary-greyDark" />
            </div>
            <div className="px-5 py-4 space-y-5">
              {/* Theme swatches */}
              <div>
                <label className="block text-[10px] text-ossuary-greyText uppercase tracking-wider mb-2 font-semibold">
                  DARK_MODE_INTENSITY
                </label>
                <div className="flex gap-3">
                  <Swatch
                    color="#000000"
                    label="VOID"
                    active={theme === "void"}
                    onClick={() => setTheme("void")}
                  />
                  <Swatch
                    color="#1a1a2e"
                    label="SLATE"
                    active={theme === "slate"}
                    onClick={() => setTheme("slate")}
                  />
                  <Swatch
                    color="#2a2a2a"
                    label="ASH"
                    active={theme === "ash"}
                    onClick={() => setTheme("ash")}
                  />
                </div>
              </div>

              {/* Font family */}
              <div>
                <label className="block text-[10px] text-ossuary-greyText uppercase tracking-wider mb-2 font-semibold">
                  FONT_FAMILY_PREF
                </label>
                <div className="relative">
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value as "JETBRAINS_MONO" | "FIRA_CODE" | "CONSOLAS" | "SF_MONO")}
                    className="w-full terminal-input text-[12px] appearance-none pr-8 cursor-pointer"
                  >
                    <option value="JETBRAINS_MONO">JETBRAINS_MONO_ONLY</option>
                    <option value="FIRA_CODE">FIRA_CODE</option>
                    <option value="CONSOLAS">CONSOLAS</option>
                    <option value="SF_MONO">SF_MONO</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ossuary-greyDark pointer-events-none"
                  />
                </div>
              </div>

              {/* Active color */}
              <div className="flex items-center gap-3">
                <label className="text-[10px] text-ossuary-greyText uppercase tracking-wider font-semibold">
                  ACTIVE_COLOR:
                </label>
                <input
                  type="color"
                  value={activeColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-8 h-8 border border-ossuary-border rounded-sm cursor-pointer bg-transparent"
                />
                <span
                  className="text-[11px] font-mono"
                  style={{ color: activeColor }}
                >
                  {activeColor}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================== */}
      {/* Footer actions */}
      {/* ============================================== */}
      <div className="px-8 mt-6">
        <div className="flex items-start justify-between">
          {/* Save actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-ossuary-yellow text-ossuary-black text-[11px] font-bold tracking-wider px-6 py-2.5 hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saved ? (
                <>
                  <Eye size={14} />
                  SAVED
                </>
              ) : (
                <>
                  <Save size={14} />
                  {saving ? "SAVING..." : "SAVE_PROTOCOLS"}
                </>
              )}
            </button>
            <button
              onClick={() => {
                if (!profile) return;
                setName(profile.name || "");
                setTitle(profile.title);
                setBio(profile.bio);
                setAlerts({ systemWhispers: profile.systemWhispers });
              }}
              className="flex items-center gap-2 bg-transparent text-ossuary-greyText text-[11px] font-bold tracking-wider px-6 py-2.5 border border-ossuary-border hover:border-ossuary-yellow hover:text-ossuary-yellow transition-colors"
            >
              DISCARD
            </button>
          </div>

          {/* Danger zone */}
          <div className="text-right">
            <div className="text-[9px] text-red-500/70 tracking-wider uppercase mb-2 flex items-center gap-1.5 justify-end">
              <AlertTriangle size={10} />
              DANGER_ZONE: PERMANENT_ERASURE
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 bg-red-950/40 border border-red-800/40 text-red-400 text-[10px] font-bold tracking-wider px-4 py-2 hover:bg-red-900/40 hover:border-red-600 hover:text-red-300 transition-colors"
            >
              <Trash2 size={12} />
              TERMINATE_ACCOUNT.EXE
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#0A0A0A] border border-ossuary-border max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-5 py-3 border-b border-red-800/40 bg-red-950/20">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                <span className="text-[11px] font-bold tracking-wider text-red-400 uppercase">
                  PERMANENT_ERASURE
                </span>
              </div>
              <button
                onClick={() => !deleting && setShowDeleteConfirm(false)}
                className="text-ossuary-greyDark hover:text-ossuary-white transition-colors"
                disabled={deleting}
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              <p className="text-[11px] text-ossuary-greyText leading-relaxed mb-6">
                {"//"} WARNING: This action cannot be undone. All your data including projects, treasures, 
                rituals, and profile information will be permanently erased from the ossuary.
              </p>

              <div className="text-[10px] text-ossuary-greyDark mb-6 font-mono">
                <div>USER_ID: {userId}</div>
                <div>ACTION: DELETE_ACCOUNT</div>
                <div>CONSEQUENCE: COMPLETE_DATA_LOSS</div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    router.push("/");
                  }}
                  disabled={deleting}
                  className="flex items-center gap-2 bg-transparent text-ossuary-greyText text-[10px] font-bold tracking-wider px-5 py-2 border border-ossuary-border hover:border-ossuary-yellow hover:text-ossuary-yellow transition-colors disabled:opacity-50"
                >
                  REVERT
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex items-center gap-2 bg-red-900/40 border border-red-800/40 text-red-400 text-[10px] font-bold tracking-wider px-5 py-2 hover:bg-red-800/40 hover:border-red-600 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <>
                      <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                      ERASING...
                    </>
                  ) : (
                    <>
                      <Trash2 size={12} />
                      CONTINUE
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
