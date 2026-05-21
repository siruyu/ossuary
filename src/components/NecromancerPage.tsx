"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, LogIn, ShieldAlert } from "lucide-react";

const TABS = [
  { key: "graveyard", label: "MY_GRAVEYARD", icon: "skull" },
  { key: "treasures", label: "LOOTED_TREASURES", icon: "diamond" },
  { key: "rituals", label: "RITUALS", icon: "ritual" },
];

// ---------------------------------------------------------------------------
// Sub-components
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
          AUTHENTICATION REQUIRED TO VIEW YOUR OSSUARY. ESTABLISH A SESSION
          TO ACCESS BURIED NODES, LOOTED TREASURES, AND RITUAL RECORDS.
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

function StatBlock({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="px-6 py-4 border-r border-ossuary-border">
      <div className="text-[9px] text-ossuary-greyDark tracking-wider uppercase mb-1">
        {label}
      </div>
      <span
        className={`text-3xl font-black num-display ${
          accent ? "text-ossuary-yellow" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ProfileData {
  uid: string;
  userName: string;
  title: string;
  level: number;
  rank: string;
  totalBuried: number;
  lootedResources: number;
  bio: string;
  masteryTags: string[];
  systemInsight: string;
}

interface BuriedNode {
  id: string;
  name: string;
  failure: string;
  description: string;
  tags: string[];
  nodeRef: string;
  repoUrl?: string;
}

interface LootedItem {
  id: string;
  repoName: string;
  repoOwner: string;
  itemName: string;
  itemPath: string;
  type: string;
  downloadedAt: string;
}

interface Ritual {
  id: string;
  repoName: string;
  failureMode: string;
  obituary: string | null;
  status: string;
  createdAt: string;
}

export default function NecromancerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = session?.user?.id;

  const [activeTab, setActiveTab] = useState("graveyard");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [buriedNodes, setBuriedNodes] = useState<BuriedNode[]>([]);
  const [lootedItems, setLootedItems] = useState<LootedItem[]>([]);
  const [rituals, setRituals] = useState<Ritual[]>([]);

  // Pagination state
  const [burialPage, setBurialPage] = useState(1);
  const [burialTotalPages, setBurialTotalPages] = useState(1);
  const [lootPage, setLootPage] = useState(1);
  const [lootTotalPages, setLootTotalPages] = useState(1);
  const [ritualPage, setRitualPage] = useState(1);
  const [ritualTotalPages, setRitualTotalPages] = useState(1);

  const loggedIn = status === "authenticated" && !!userId;

  const fetchBurials = useCallback(async (page = 1) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/burial?userId=${encodeURIComponent(userId)}&page=${page}&limit=10`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setBuriedNodes(data.burials);
        setBurialTotalPages(data.totalPages);
        setBurialPage(data.page);
      }
    } catch (err) {
      console.error("Failed to fetch burials:", err);
    }
  }, [userId]);

  const fetchLootedItems = useCallback(async (page = 1) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/loot?page=${page}&limit=20`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setLootedItems(data.items);
        setLootTotalPages(data.totalPages);
        setLootPage(data.page);
      } else {
        console.error("Failed to fetch looted items:", res.status);
      }
    } catch (err) {
      console.error("Failed to fetch looted items:", err);
    }
  }, [userId]);

  const fetchRituals = useCallback(async (page = 1) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/rituals?userId=${encodeURIComponent(userId)}&page=${page}&limit=10`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setRituals(data.rituals);
        setRitualTotalPages(data.totalPages);
        setRitualPage(data.page);
      }
    } catch (err) {
      console.error("Failed to fetch rituals:", err);
    }
  }, [userId]);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`, { credentials: "include" });
      if (res.ok) {
        setProfile(await res.json());
      }
    } catch (err) {
      console.error("Failed to refresh profile:", err);
    }
  }, [userId]);

  const deleteBurial = useCallback(async (projectId: string) => {
    if (!userId || !confirm("EXHUME THIS BURIED NODE? THIS CANNOT BE UNDONE.")) return;
    try {
      const res = await fetch("/api/burial", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, projectId }),
      });
      if (res.ok) {
        setBuriedNodes((prev) => prev.filter((n) => n.id !== projectId));
        await Promise.all([fetchBurials(1), fetchRituals(1), refreshProfile()]);
      } else {
        const err = await res.json();
        alert("EXHUME_FAILED: " + (err.error || "Unknown error"));
      }
    } catch {
      alert("EXHUME_FAILED: Network error");
    }
  }, [userId, fetchBurials, fetchRituals, refreshProfile]);

  const deleteRitual = useCallback(async (ritualId: string) => {
    if (!userId || !confirm("SEVER THIS RITUAL? THIS CANNOT BE UNDONE.")) return;
    try {
      const res = await fetch("/api/rituals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ritualId }),
      });
      if (res.ok) {
        setRituals((prev) => prev.filter((r) => r.id !== ritualId));
        await Promise.all([fetchBurials(1), refreshProfile()]);
      } else {
        const err = await res.json();
        alert("SEVER_FAILED: " + (err.error || "Unknown error"));
      }
    } catch {
      alert("SEVER_FAILED: Network error");
    }
  }, [userId, fetchBurials, refreshProfile]);

  useEffect(() => {
    if (!loggedIn || !userId) return;

    let cancelled = false;
    async function fetchData() {
      try {
        // Fetch profile first
        const profileRes = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`, { credentials: "include" });
        if (cancelled) return;
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
        }
        
        // Fetch all lists in parallel
        await Promise.all([fetchBurials(1), fetchLootedItems(1), fetchRituals(1)]);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [loggedIn, userId]);

  if (status === "loading") {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center bg-[#060606]">
        <div className="text-ossuary-greyDark text-sm tracking-widest animate-pulse">
          CHECKING_CREDENTIALS...
        </div>
      </div>
    );
  }

  if (!loggedIn) return <NotLoggedIn />;

  const p: ProfileData = profile
    ? {
        ...profile,
        userName: profile.userName,
      }
    : {
        uid: session.user?.id?.slice(0, 8).toUpperCase() || "???",
        userName: (session.user?.name || session.user?.email || "UNKNOWN").toUpperCase(),
        title: "APPRENTICE",
        level: 1,
        rank: "NOVICE",
        totalBuried: 0,
        lootedResources: 0,
        bio: "ESTABLISHING YOUR PROFILE. SET UP YOUR BIO IN SETTINGS.",
        masteryTags: [],
        systemInsight: '"AWAITING FIRST BURIAL TO GENERATE INSIGHT."',
      };

  return (
    <div className="bg-[#060606]">
      {/* Header */}
      <div className="border-b border-ossuary-border">
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="w-1 bg-ossuary-yellow h-32 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-ossuary-yellow text-ossuary-black text-[9px] font-bold px-2 py-0.5 tracking-wider">
                {p.title}
              </span>
              <span className="text-[9px] text-ossuary-greyDark tracking-wider">
                UID: {p.uid}
              </span>
            </div>
            <h1 className="text-6xl font-black tracking-tight">
              {p.userName}
            </h1>
          </div>
          
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 border-t border-ossuary-border">
          <StatBlock label="TOTAL_BURIED_NODES" value={p.totalBuried} />
          <StatBlock label="LOOTED_RESOURCES" value={p.lootedResources} accent />
          <div className="px-6 py-4">
            <div className="text-[9px] text-ossuary-greyDark tracking-wider uppercase mb-1">
              REPUTATION_LVL
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black num-display">{p.level}</span>
              <span className="text-[10px] font-bold text-ossuary-yellow tracking-wider">
                {p.rank}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub header actions */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-ossuary-border">
        <div className="text-right flex-1">
          <button className="text-[10px] font-bold tracking-wider text-ossuary-grey hover:text-ossuary-yellow transition-colors">
            EXPORT_OSSUARY
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ossuary-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 text-[10px] font-bold tracking-wider uppercase flex items-center gap-2 border-r border-ossuary-border transition-all ${
              activeTab === tab.key
                ? "bg-[#111] text-ossuary-white"
                : "text-ossuary-greyDark hover:text-ossuary-grey"
            }`}
          >
            {tab.key === "graveyard" && <span>&#x1f480;</span>}
            {tab.key === "treasures" && <span>&#x1f48e;</span>}
            {tab.key === "rituals" && <span>&#x1f52e;</span>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="grid grid-cols-4 gap-px bg-ossuary-border border-x border-b border-ossuary-border">
        {activeTab === "graveyard" ? (
          <>
            <div className="bg-[#060606] p-6">
              <div className="text-[10px] text-ossuary-greyDark tracking-wider uppercase mb-4">
                / BIO_OBITUARY
              </div>
              <p className="text-[10px] text-ossuary-grey leading-loose mb-6">
                {p.bio}
              </p>

              <div className="text-[10px] text-ossuary-greyDark tracking-wider uppercase mb-3">
                / MASTERY_TAGS
              </div>
              <div className="flex flex-wrap gap-1.5 mb-6">
                {p.masteryTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] text-ossuary-grey border border-ossuary-border px-2 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="text-[10px] text-ossuary-yellow font-bold tracking-wider uppercase mb-2">
                SYSTEM_INSIGHT
              </div>
              <p className="text-[9px] text-ossuary-grey italic leading-relaxed border-l border-ossuary-yellow/30 pl-3">
                {p.systemInsight}
              </p>
            </div>

            {buriedNodes.length > 0 ? (
              buriedNodes.map((node, i) => (
                <div key={node.id} className={`bg-[#060606] p-5 ${i < buriedNodes.length - 1 ? "border-b border-ossuary-border" : ""}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold underline underline-brutal">
                      {node.name}
                    </h3>
                    <span className="text-[9px] text-ossuary-greyDark">{node.nodeRef}</span>
                  </div>
                  <span className="text-[9px] bg-ossuary-white text-ossuary-black px-2 py-0.5 font-bold tracking-wider">
                    FAILURE: {node.failure}
                  </span>
                  <p className="text-[10px] text-ossuary-grey leading-relaxed mt-3 mb-4">
                    {node.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 flex-wrap">
                      {node.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] text-ossuary-grey border border-ossuary-border px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          const repoFullName = node.repoUrl 
                            ? node.repoUrl.replace("https://github.com/", "")
                            : node.name;
                          router.push(`/extract?repo=${encodeURIComponent(repoFullName)}`);
                        }}
                        className="text-[9px] text-ossuary-grey underline underline-offset-2 hover:text-ossuary-yellow transition-colors"
                      >
                        EXAMINE
                      </button>
                      <button 
                        onClick={() => deleteBurial(node.id)}
                        className="text-[9px] text-red-400 underline underline-offset-2 hover:text-red-300 font-bold"
                      >
                        EXHUME
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-[#060606] p-8 col-span-3 text-center">
                <div className="text-ossuary-greyDark text-lg mb-1">NO_BURIED_NODES_FOUND</div>
                <div className="text-[10px] text-ossuary-greyDark">BURY YOUR FIRST PROJECT FROM THE RITUAL PAGE</div>
              </div>
            )}

              {/* Bury new failure card */}
            <Link
              href="/ritual"
              className="bg-[#111] p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-ossuary-panel transition-colors"
            >
              <div className="w-12 h-12 border-2 border-ossuary-white flex items-center justify-center mb-4">
                <Plus size={28} />
              </div>
              <div className="text-sm font-bold tracking-wider mb-1">
                BURY_NEW_FAILURE
              </div>
              <div className="text-[9px] text-ossuary-greyDark uppercase">
                ADD_TO_OSSUARY
              </div>
            </Link>
            {burialTotalPages > 1 && (
              <div className="col-span-4 flex justify-center gap-2 py-4">
                <button
                  onClick={() => fetchBurials(burialPage - 1)}
                  disabled={burialPage <= 1}
                  className="px-3 py-1 text-[10px] border border-ossuary-border text-ossuary-grey hover:text-ossuary-white disabled:opacity-30"
                >
                  PREV
                </button>
                <span className="px-3 py-1 text-[10px] text-ossuary-grey">
                  {burialPage} / {burialTotalPages}
                </span>
                <button
                  onClick={() => fetchBurials(burialPage + 1)}
                  disabled={burialPage >= burialTotalPages}
                  className="px-3 py-1 text-[10px] border border-ossuary-border text-ossuary-grey hover:text-ossuary-white disabled:opacity-30"
                >
                  NEXT
                </button>
              </div>
            )}
          </>
        ) : activeTab === "treasures" ? (
          <>
            <div className="col-span-4 grid grid-cols-2 gap-px bg-ossuary-border">
              {lootedItems.length > 0 ? (
                lootedItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#060606] p-6 border-b border-ossuary-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-bold text-ossuary-yellow">
                        {item.itemName}
                      </h3>
                      <span className="text-[9px] text-ossuary-greyDark">
                        {item.repoOwner}/{item.repoName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[9px] px-2 py-0.5 font-bold tracking-wider ${
                        item.type === "repo" 
                          ? "bg-ossuary-yellow text-ossuary-black" 
                          : "bg-ossuary-panel text-ossuary-white border border-ossuary-border"
                      }`}>
                        {item.type === "repo" ? "FULL_REPO" : "MODULE"}
                      </span>
                      {item.itemPath && (
                        <span className="text-[9px] text-ossuary-greyDark truncate">
                          {item.itemPath}
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-ossuary-greyDark">
                      LOOTED: {new Date(item.downloadedAt).toLocaleDateString()} {new Date(item.downloadedAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 bg-[#060606] p-8 text-center">
                  <div className="text-ossuary-greyDark text-lg mb-1">NO_LOOTED_TREASURES</div>
                  <div className="text-[10px] text-ossuary-greyDark">LOOT MODULES FROM THE EXTRACT PAGE</div>
                </div>
              )}
            </div>
            {lootTotalPages > 1 && (
              <div className="col-span-4 flex justify-center gap-2 py-4">
                <button
                  onClick={() => fetchLootedItems(lootPage - 1)}
                  disabled={lootPage <= 1}
                  className="px-3 py-1 text-[10px] border border-ossuary-border text-ossuary-grey hover:text-ossuary-white disabled:opacity-30"
                >
                  PREV
                </button>
                <span className="px-3 py-1 text-[10px] text-ossuary-grey">
                  {lootPage} / {lootTotalPages}
                </span>
                <button
                  onClick={() => fetchLootedItems(lootPage + 1)}
                  disabled={lootPage >= lootTotalPages}
                  className="px-3 py-1 text-[10px] border border-ossuary-border text-ossuary-grey hover:text-ossuary-white disabled:opacity-30"
                >
                  NEXT
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {rituals.length > 0 ? (
              <div className="col-span-4 grid grid-cols-2 gap-px bg-ossuary-border">
                {rituals.map((ritual) => (
                  <div
                    key={ritual.id}
                    className="bg-[#060606] p-6 border-b border-ossuary-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-bold text-ossuary-yellow">
                        {ritual.repoName}
                      </h3>
                      <span className="text-[9px] text-ossuary-yellow bg-ossuary-black px-2 py-0.5 font-bold tracking-wider">
                        {ritual.status}
                      </span>
                    </div>
                    <div className="text-[9px] text-ossuary-greyDark mb-3">
                      FAILURE MODE: {ritual.failureMode}
                    </div>
                    {ritual.obituary && (
                      <p className="text-[10px] text-ossuary-grey leading-relaxed mb-3 border-l border-ossuary-yellow/30 pl-3 italic">
                        {ritual.obituary}
                      </p>
                    )}
                    <div className="text-[9px] text-ossuary-greyDark">
                      PERFORMED: {new Date(ritual.createdAt).toLocaleDateString()}
                    </div>
                    <button 
                      onClick={() => deleteRitual(ritual.id)}
                      className="mt-3 text-[9px] text-red-400 underline underline-offset-2 hover:text-red-300 font-bold"
                    >
                      SEVER
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="col-span-4 bg-[#060606] p-12 text-center">
                <div className="text-ossuary-greyDark text-lg mb-2">NO_ACTIVE_RITUALS</div>
                <div className="text-[10px] text-ossuary-greyDark">COMMENCE A NEW RITUAL FROM THE RITUAL TAB</div>
              </div>
            )}
            {ritualTotalPages > 1 && (
              <div className="col-span-4 flex justify-center gap-2 py-4">
                <button
                  onClick={() => fetchRituals(ritualPage - 1)}
                  disabled={ritualPage <= 1}
                  className="px-3 py-1 text-[10px] border border-ossuary-border text-ossuary-grey hover:text-ossuary-white disabled:opacity-30"
                >
                  PREV
                </button>
                <span className="px-3 py-1 text-[10px] text-ossuary-grey">
                  {ritualPage} / {ritualTotalPages}
                </span>
                <button
                  onClick={() => fetchRituals(ritualPage + 1)}
                  disabled={ritualPage >= ritualTotalPages}
                  className="px-3 py-1 text-[10px] border border-ossuary-border text-ossuary-grey hover:text-ossuary-white disabled:opacity-30"
                >
                  NEXT
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}