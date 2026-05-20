"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Search,
  Code2,
  Plus,
  ChevronDown,
  Zap,
  Terminal,
  Lock,
} from "lucide-react";

interface Module {
  id: string;
  name: string;
  source: string;
  description: string;
  tags: string[];
  downloadCount: number;
  extractCount: number;
  respects: number;
  buriedProjectId: string | null;
  createdAt: string;
  updatedAt: string;
  projectName: string | null;
}

type ClassLabel = "ALPHA_CLASS" | "BETA_CLASS" | "OMEGA_CLASS" | "DELTA_CLASS";

const CLASS_LABELS: ClassLabel[] = [
  "ALPHA_CLASS",
  "BETA_CLASS",
  "OMEGA_CLASS",
  "DELTA_CLASS",
];

function getClassLabel(index: number): ClassLabel {
  if (index === 0) return "OMEGA_CLASS";
  if (index === 1) return "BETA_CLASS";
  if (index === 2) return "ALPHA_CLASS";
  return CLASS_LABELS[index % CLASS_LABELS.length];
}

const THUMBNAIL_GRADIENTS = [
  "linear-gradient(135deg, #111 0%, #1a1a2e 50%, #0d0d0d 100%)",
  "linear-gradient(135deg, #0d0d0d 0%, #1a0a2e 50%, #111 100%)",
  "linear-gradient(135deg, #1a1a1a 0%, #0a1a0a 50%, #0d0d0d 100%)",
  "linear-gradient(135deg, #0d0d1a 0%, #1a1a1a 50%, #1a0a1a 100%)",
  "linear-gradient(135deg, #111 0%, #2a1a0a 50%, #0d0d0d 100%)",
  "linear-gradient(135deg, #0a0a1a 0%, #111 50%, #1a1a0a 100%)",
];

export default function RepositoryPage() {
  const { data: session, status } = useSession();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [langFilter, setLangFilter] = useState("ALL");
  const [threatFilter, setThreatFilter] = useState("ANY");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [threatDropdownOpen, setThreatDropdownOpen] = useState(false);
  const [looting, setLooting] = useState<string | null>(null);
  const [looted, setLooted] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/treasures")
      .then((r) => r.json())
      .then((data) => {
        // Handle both paginated and non-paginated response
        const modulesData = data.modules || data;
        setModules(modulesData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Collect unique language tags
  const languages = useMemo(() => {
    const set = new Set<string>();
    modules.forEach((m) => m.tags.forEach((t) => set.add(t)));
    return ["ALL", ...Array.from(set).sort()];
  }, [modules]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler() {
      setLangDropdownOpen(false);
      setThreatDropdownOpen(false);
    }
    if (langDropdownOpen || threatDropdownOpen) {
      document.addEventListener("click", handler);
      return () => document.removeEventListener("click", handler);
    }
  }, [langDropdownOpen, threatDropdownOpen]);

  const filtered = useMemo(() => {
    let result = modules;
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.source.toLowerCase().includes(q)
      );
    }
    if (langFilter !== "ALL") {
      result = result.filter((m) => m.tags.includes(langFilter));
    }
    if (threatFilter !== "ANY") {
      result = result.filter((m) => {
        if (threatFilter === "LOW") return m.extractCount < 10;
        if (threatFilter === "MEDIUM")
          return m.extractCount >= 10 && m.extractCount < 50;
        if (threatFilter === "HIGH") return m.extractCount >= 50;
        return true;
      });
    }
    result = [...result].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return result;
  }, [modules, searchValue, langFilter, threatFilter]);

  const handleSearch = () => {
    setSearchValue(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const userId = session?.user?.id;

  const handleLoot = useCallback(
    async (mod: Module) => {
      if (!userId) {
        alert("Please log in to loot modules");
        return;
      }
      if (looted.has(mod.id) || looting) return;
      setLooting(mod.id);
      try {
        const res = await fetch("/api/treasures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            moduleId: mod.id,
            name: mod.name,
            source: mod.source,
            description: mod.description,
            tags: mod.tags,
          }),
        });
        if (res.ok) {
          setLooted((prev) => new Set(prev).add(mod.id));
          setModules((prev) =>
            prev.map((m) =>
              m.id === mod.id
                ? { ...m, extractCount: m.extractCount + 1, downloadCount: m.downloadCount + 1 }
                : m
            )
          );

          const repoFullName = mod.source;
          if (repoFullName) {
            const downloadRes = await fetch("/api/extract", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "zipball",
                repoFullName,
              }),
            });
            if (downloadRes.ok) {
              const blob = await downloadRes.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              const repoName = repoFullName.split("/").pop() || "repo";
              a.download = `${repoName}.zip`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            } else {
              const err = await downloadRes.json().catch(() => ({}));
              alert("Download failed: " + (err.error || "Unknown error"));
            }
          }
        } else {
          const err = await res.json().catch(() => ({}));
          alert("Loot failed: " + (err.error || "Unknown error"));
        }
      } catch (e) {
        alert("Loot failed: Network error");
      } finally {
        setLooting(null);
      }
    },
    [looted, looting, userId]
  );

  const totalExtracts = modules.reduce((s, m) => s + m.extractCount, 0);

  const handleSearchDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="p-6 pb-0">
      {/* ====== Page Header ====== */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-ossuary-yellow text-ossuary-black text-[10px] font-bold px-3 py-1 tracking-wider uppercase">
                STRIKE_CONFIRMED
              </span>
              <span className="text-[9px] text-ossuary-greyDark tracking-wider">
                DIR: /ROOT/REPOSITORY
              </span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-black tracking-tight">
              LOOT
              <span className="text-ossuary-yellow">.REPOSITORY</span>
            </h1>
            <p className="text-[10px] lg:text-[11px] text-ossuary-grey tracking-wider mt-2 max-w-2xl leading-relaxed">
              {"> "}
              EXHUMING_LEGACY_CODESETS_FOR_EXTRACTION.EXE // CURATED ARCHIVE
              OF FUNCTIONAL REMNANTS EXTRACTED FROM THE VOID.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-2">
            <span className="text-[9px] text-ossuary-greyDark tracking-wider uppercase">
              EXTRACTION_STATUS
            </span>
            <span className="text-xl font-black text-ossuary-yellow num-display">
              {String(totalExtracts).padStart(3, "0")}
            </span>
            <span className="text-[9px] text-ossuary-greyDark tracking-wider">
              ARTIFACTS_EXUMED
            </span>
          </div>
        </div>
      </div>

      {/* ====== Auth Check ====== */}
      {status === "loading" ? (
        <div className="p-16 text-center border border-ossuary-border">
          <div className="text-[11px] text-ossuary-grey tracking-widest uppercase animate-pulse">
            AUTHENTICATING_IDENTITY...
          </div>
        </div>
      ) : !session ? (
        <div className="p-16 text-center border border-ossuary-border">
          <div className="flex flex-col items-center gap-4">
            <Lock size={48} className="text-ossuary-yellow/50" />
            <div>
              <div className="text-[11px] text-ossuary-grey tracking-widest uppercase mb-1">
                RESTRICTED_ACCESS_DETECTED
              </div>
              <div className="text-[9px] text-ossuary-greyDark tracking-wider">
                AUTHENTICATION_REQUIRED_TO_ACCESS_LOOT_ARCHIVE
              </div>
            </div>
            <Link
              href="/login"
              className="mt-4 bg-ossuary-yellow text-ossuary-black text-[10px] font-bold px-6 py-3 tracking-wider hover:bg-ossuary-yellow/80 transition-colors"
            >
              AUTHENTICATE_NOW
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ====== Search & Filter Bar ====== */}
      <div className="border border-ossuary-border bg-ossuary-panel mb-6">
        <div className="flex items-center gap-2 p-3">
          {/* Search input */}
          <div
            className="flex items-center gap-2 flex-1 bg-ossuary-black border border-ossuary-border px-3 py-2 focus-within:border-ossuary-yellow/50 transition-colors"
            onClick={handleSearchDropdownClick}
          >
            <Search size={14} className="text-ossuary-greyDark flex-shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="SEARCH_ARTIFACTS..."
              className="bg-transparent text-[11px] text-ossuary-white outline-none placeholder:text-ossuary-greyDark flex-1 tracking-wider"
            />
          </div>

          {/* Language dropdown */}
          <div className="relative" onClick={handleSearchDropdownClick}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLangDropdownOpen(!langDropdownOpen);
                setThreatDropdownOpen(false);
              }}
              className="flex items-center gap-2 bg-ossuary-black border border-ossuary-border px-3 py-2 text-[10px] text-ossuary-grey tracking-wider hover:border-ossuary-yellow/30 transition-colors"
            >
              LANG: {langFilter}
              <ChevronDown size={12} />
            </button>
            {langDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-ossuary-black border border-ossuary-border z-50 max-h-48 overflow-y-auto min-w-[160px]">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLangFilter(lang);
                      setLangDropdownOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-[10px] tracking-wider hover:bg-ossuary-panel transition-colors ${
                      langFilter === lang
                        ? "text-ossuary-yellow"
                        : "text-ossuary-grey"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Threat level dropdown */}
          <div className="relative" onClick={handleSearchDropdownClick}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setThreatDropdownOpen(!threatDropdownOpen);
                setLangDropdownOpen(false);
              }}
              className="flex items-center gap-2 bg-ossuary-black border border-ossuary-border px-3 py-2 text-[10px] text-ossuary-grey tracking-wider hover:border-ossuary-yellow/30 transition-colors"
            >
              THREAT_LEVEL: {threatFilter}
              <ChevronDown size={12} />
            </button>
            {threatDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-ossuary-black border border-ossuary-border z-50 min-w-[160px]">
                {["ANY", "LOW", "MEDIUM", "HIGH"].map((level) => (
                  <button
                    key={level}
                    onClick={(e) => {
                      e.stopPropagation();
                      setThreatFilter(level);
                      setThreatDropdownOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-[10px] tracking-wider hover:bg-ossuary-panel transition-colors ${
                      threatFilter === level
                        ? "text-ossuary-yellow"
                        : "text-ossuary-grey"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter/sort button */}
          <button
            onClick={() => {
              setSearchValue(searchInput);
            }}
            className="flex items-center gap-2 bg-ossuary-black border border-ossuary-border px-3 py-2 text-[10px] text-ossuary-grey tracking-wider hover:border-ossuary-yellow/30 hover:text-ossuary-yellow transition-colors"
          >
            <Zap size={12} />
          </button>
        </div>
      </div>

      {/* ====== Module Cards Grid ====== */}

      {/* Loading state */}
      {loading && (
        <div className="p-16 text-center border border-ossuary-border">
          <div className="text-[11px] text-ossuary-grey tracking-widest uppercase animate-pulse">
            SCANNING_ARCHIVE_NODES...
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="p-16 text-center border border-ossuary-border">
          <div className="text-[11px] text-ossuary-grey tracking-widest uppercase mb-1">
            {searchValue || langFilter !== "ALL" || threatFilter !== "ANY"
              ? "NO_MATCHING_ARTIFACTS_FOUND"
              : "NO_MODULES_AVAILABLE"}
          </div>
          <div className="text-[9px] text-ossuary-greyDark tracking-wider">
            {searchValue || langFilter !== "ALL" || threatFilter !== "ANY"
              ? "TRY_ADJUSTING_FILTER_PARAMETERS"
              : "ARCHIVE_NODE_RETURNED_EMPTY_MANIFEST"}
          </div>
        </div>
      )}

      {/* Card grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {filtered.map((mod, i) => {
            const isLooted = looted.has(mod.id);
            const isLooting = looting === mod.id;
            return (
              <div
                key={mod.id}
                className="border border-ossuary-border bg-[#0a0a0a] group hover:border-ossuary-yellow/30 transition-all duration-200"
              >
                {/* Thumbnail area with grid/wireframe overlay */}
                <div
                  className="relative h-36 overflow-hidden"
                  style={{
                    background:
                      THUMBNAIL_GRADIENTS[i % THUMBNAIL_GRADIENTS.length],
                  }}
                >
                  {/* Grid wireframe pattern overlay */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,215,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,0.05) 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                  {/* Decorative wireframe elements */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 border border-ossuary-yellow/10 rotate-45" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 border border-ossuary-white/5 rotate-12" />
                  </div>
                  {/* Code decoration */}
                  <div className="absolute bottom-2 left-2 text-[8px] text-ossuary-yellow/20 font-mono tracking-wider">
                    {`{${mod.tags.slice(0, 2).join(",")}}`}
                  </div>

                  {/* Class label pill (top-right) */}
                  <div className="absolute top-2 right-2">
                    <span className="bg-ossuary-yellow text-ossuary-black text-[8px] font-bold px-2 py-0.5 tracking-wider uppercase">
                      {getClassLabel(i)}
                    </span>
                  </div>
                </div>

                {/* Card content */}
                <div className="p-4">
                  {/* SRC label */}
                  <div className="text-[9px] text-ossuary-yellow tracking-wider mb-1 font-medium">
                    SRC: {mod.projectName || mod.source || "UNKNOWN_ORIGIN"}
                  </div>

                  {/* Module name (large, white, underlined) */}
                  <h3 className="text-base font-black text-ossuary-white underline underline-offset-4 decoration-ossuary-yellow/40 mb-2 tracking-wide group-hover:decoration-ossuary-yellow transition-colors">
                    {mod.name}
                  </h3>

                  {/* Description quote */}
                  <p className="text-[10px] text-ossuary-grey italic leading-relaxed mb-3 border-l-2 border-ossuary-yellow/20 pl-3">
                    {mod.description || "No description recovered from void."}
                  </p>

                  {/* Language/version tags */}
                  {mod.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {mod.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] text-ossuary-greyDark bg-ossuary-panel border border-ossuary-border px-2 py-0.5 tracking-wider"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bottom section: count + buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-ossuary-border/50">
                    <span className="text-[9px] text-ossuary-greyDark tracking-wider">
                      {mod.extractCount}x{" "}
                      <span className="text-ossuary-grey">EXTRACTED</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {/* LOOT_MODULE button */}
                      <button
                        disabled={isLooted || isLooting}
                        onClick={() => handleLoot(mod)}
                        className={`text-[10px] font-bold tracking-wider px-4 py-2 flex items-center gap-1.5 transition-all ${
                          isLooted
                            ? "bg-ossuary-yellow/10 text-ossuary-yellow border border-ossuary-yellow/30 cursor-default"
                            : isLooting
                            ? "bg-ossuary-yellow/20 text-ossuary-yellow/50 border border-ossuary-yellow/20 cursor-wait"
                            : "bg-ossuary-panel border border-ossuary-border text-ossuary-white hover:bg-ossuary-yellow hover:text-ossuary-black hover:border-ossuary-yellow"
                        }`}
                      >
                        {isLooted ? (
                          <>LOOTED</>
                        ) : isLooting ? (
                          <>
                            <Terminal size={12} className="animate-pulse" />
                            EXTRACTING...
                          </>
                        ) : (
                          <>
                            <Code2 size={12} />
                            LOOT_MODULE
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* "Add New" card */}
          <Link
            href="/ritual"
            className="border-2 border-dashed border-ossuary-border bg-[#0a0a0a] flex flex-col items-center justify-center py-12 cursor-pointer hover:border-ossuary-yellow/40 hover:bg-ossuary-panel transition-all group/add"
          >
            <div className="w-14 h-14 border border-ossuary-border group-hover/add:border-ossuary-yellow/50 flex items-center justify-center mb-4 transition-colors">
              <Plus
                size={24}
                className="text-ossuary-greyDark group-hover/add:text-ossuary-yellow transition-colors"
              />
            </div>
            <div className="text-sm font-bold text-ossuary-grey group-hover/add:text-ossuary-white tracking-wider mb-1 transition-colors">
              EXHUME_NEW_PROJECT
            </div>
            <div className="text-[9px] text-ossuary-greyDark tracking-wider uppercase">
              CONNECT_GRAVEYARD_CONNECTOR.BIN
            </div>
          </Link>
        </div>
      )}

      
        </>
      )}
    </div>
  );
}
