"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronDown, SlidersHorizontal, Download, Star, GitFork, X } from "lucide-react";
import TerminalText from "./TerminalText";
import { CAUSES_OF_DEATH } from "../lib/data";

interface ProjectCard {
  id: string;
  name: string;
  tagline: string;
  image: string;
  failureMode: string;
  tags: string[];
  stars: number;
  forks: number;
  conceived: string;
  terminated: string;
  repoUrl?: string;
}

interface ApiResponse {
  projects: {
    id: string;
    name: string;
    description: string;
    language: string | null;
    topics: string[];
    stars: number;
    forks: number;
    lastCommit: string;
    updatedAt: string;
    html_url: string;
    clone_url: string;
  }[];
  total: number;
  page: number;
  totalPages: number;
}

function formatConceivedTerminated(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

export default function Mausoleum() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Current values in UI state (synced from URL)
  const search = searchParams.get("search") || "";
  const causeOfDeath = searchParams.get("causeOfDeath") || "ALL";

  // Debounce timer for search
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch projects - append true adds additional repos from next page to current
  const fetchProjects = useCallback(async (searchQ: string, cause: string, pageNum: number, append = false) => {
    setLoading(true);
    const fetchPage = append ? pageNum + 1 : pageNum;
    const params = new URLSearchParams();
    if (searchQ) params.set("search", searchQ);
    if (cause && cause !== "ALL") params.set("causeOfDeath", cause);
    params.set("page", String(fetchPage));

    try {
      const res = await fetch(`/api/mausoleum?${params.toString()}`);
      const data: ApiResponse = await res.json();
      const newProjects = data.projects.map((p) => ({
        id: p.id,
        name: p.name,
        tagline: p.description || "NO_DESCRIPTION_PROVIDED",
        image: "",
        failureMode: p.topics?.[0]?.toUpperCase() || "INACTIVE",
        tags: p.topics || [p.language].filter(Boolean),
        stars: p.stars,
        forks: p.forks,
        conceived: formatConceivedTerminated(p.updatedAt || new Date().toISOString()),
        terminated: formatConceivedTerminated(p.lastCommit || p.updatedAt || new Date().toISOString()),
        repoUrl: p.html_url,
      }));

      if (append) {
        setProjects((prev) => [...prev, ...newProjects]);
      } else {
        setProjects(newProjects);
      }
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setPage(data.page);
    } catch {
      setProjects([]);
      setTotalPages(0);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + refetch when URL changes
  useEffect(() => {
    const pageNum = Number(searchParams.get("page")) || 1;
    fetchProjects(search, causeOfDeath, pageNum);
  }, [fetchProjects, search, causeOfDeath, searchParams]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search input handler
  function handleSearchInput(value: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.delete("page"); // reset to page 1 on new search
      router.push(`?${params.toString()}`, { scroll: false });
    }, 350);
  }

  function handleCauseSelect(cause: string) {
    setDropdownOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (cause === "ALL") {
      params.delete("causeOfDeath");
    } else {
      params.set("causeOfDeath", cause);
    }
    params.delete("page");
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const failureBadgeColors: Record<string, string> = {
    MARKET_FIT: "MARKET_FIT",
    COMPLEXITY: "COMPLEXITY",
    LACK_OF_FUNDS: "LACK_OF_FUNDS",
    TECHNICAL_DEBT: "TECHNICAL_DEBT",
    PASSION_FADED: "PASSION_FADED",
    SCOPE_CREEP: "SCOPE_CREEP",
    TEAM_FRACTURE: "TEAM_FRACTURE",
  };

  return (
    <div className="p-6">
      {/* Strike banner + Title */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          <span className="bg-ossuary-yellow text-ossuary-black text-[10px] font-bold px-2 py-0.5 tracking-wider">
            STRIKE_CONFIRMED
          </span>
          <span className="text-[10px] text-ossuary-grey tracking-wider uppercase">
            DIR: //ROOT/ARCHIVE
          </span>
          <span className="text-[10px] text-ossuary-greyDark tracking-wider">
            {total} ENTITIES EXHUMED
          </span>
        </div>
        <h1 className="text-6xl font-black tracking-tight mb-2">
          THE.<span className="text-ossuary-yellow">MAUSOLEUM</span>
        </h1>
        <div className="text-[11px] text-ossuary-grey tracking-widest uppercase">
          {"> "}
          <TerminalText text="EXHUMING_LEGACY_CODESETS_FOR_EXTRACTION.EXE" speed={40} />
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex items-center mb-10 border border-ossuary-border">
        <div className="flex items-center gap-3 flex-1 px-4 py-3 border-r border-ossuary-border">
          <Search size={16} className="text-ossuary-grey flex-shrink-0" />
          <input
            type="text"
            placeholder="EXHUME_REPOSITORIES..."
            defaultValue={search}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-ossuary-white placeholder:text-ossuary-greyDark w-full font-mono"
          />
          {search && (
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("search");
                params.delete("page");
                router.push(`?${params.toString()}`, { scroll: false });
              }}
              className="flex-shrink-0 text-ossuary-greyDark hover:text-ossuary-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center relative" ref={dropdownRef}>
          <div
            className="flex items-center gap-2 px-4 py-3 border-r border-ossuary-border cursor-pointer hover:bg-ossuary-panel transition-colors"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span className="text-[10px] tracking-wider text-ossuary-grey uppercase">
              CAUSE_OF_DEATH: {causeOfDeath || "ALL"}
            </span>
            <ChevronDown size={14} className="text-ossuary-grey" />
          </div>
          {dropdownOpen && (
            <div className="absolute top-full left-0 z-50 mt-0 bg-[#060606] border border-ossuary-border min-w-56">
              {CAUSES_OF_DEATH.map((cause) => (
                <button
                  key={cause}
                  onClick={() => handleCauseSelect(cause)}
                  className={`w-full text-left px-4 py-2.5 text-[11px] tracking-wider font-mono transition-colors ${
                    cause === (causeOfDeath || "ALL")
                      ? "text-ossuary-yellow bg-ossuary-panel"
                      : "text-ossuary-grey hover:text-ossuary-white hover:bg-ossuary-panel"
                  }`}
                >
                  {cause === "ALL" ? "ALL CAUSES" : cause}
                </button>
              ))}
            </div>
          )}
          <div className="px-4 py-3">
            <SlidersHorizontal size={16} className="text-ossuary-grey" />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-16">
          <p className="text-ossuary-grey text-xs font-mono tracking-widest animate-pulse">
            EXHUMING_REMAINS...
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="text-center py-16 border border-ossuary-border mb-10">
          <p className="text-ossuary-greyDark text-sm font-mono tracking-widest mb-2">
            NO_ENTITIES_FOUND
          </p>
          <p className="text-ossuary-grey text-[11px] font-mono">
            {"// "}Configure GITHUB_TOKEN to exhume failed repos from GitHub
          </p>
        </div>
      )}

      {/* Project Grid */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-3 gap-px bg-ossuary-border border border-ossuary-border mb-10">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-[#060606] p-0 relative group"
            >
              {/* Image placeholder */}
              <div className="h-40 bg-gradient-to-b from-ossuary-panel to-ossuary-black relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border border-ossuary-border opacity-30 grid place-items-center">
                    <Code2Mono
                      size={24}
                      className="text-ossuary-greyDark opacity-40"
                    />
                  </div>
                </div>
                <div className="absolute inset-0 bg-grid-pattern opacity-50" />
                <span className="absolute top-3 right-3 bg-ossuary-yellow text-ossuary-black text-[9px] font-bold px-2 py-0.5 tracking-wider">
                  {failureBadgeColors[project.failureMode] || project.failureMode}
                </span>
              </div>

              {/* Info section */}
              <div className="p-4">
                <h3 className="text-base font-bold tracking-tight mb-1 underline cursor-pointer hover:text-ossuary-yellow underline-brutal">
                  <a
                    href={project.repoUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ossuary-white hover:text-ossuary-yellow"
                  >
                    {project.name}
                  </a>
                </h3>
                <p className="text-[10px] text-ossuary-grey leading-relaxed mb-3 line-clamp-3">
                  {project.tagline}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {project.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] text-ossuary-grey border border-ossuary-border px-2 py-0.5 tracking-wider"
                    >
                      {tag}
                    </span>
                  ))}
                  {project.tags.length > 5 && (
                    <span className="text-[9px] text-ossuary-greyDark tracking-wider">
                      +{project.tags.length - 5}
                    </span>
                  )}
                </div>

                {/* Stats + Extract */}
                <div className="flex items-center justify-between pt-3 border-t border-ossuary-border">
                  <div className="flex items-center gap-4 text-[10px] text-ossuary-grey">
                    <span className="flex items-center gap-1">
                      <Star size={10} />{" "}
                      <span className="num-display">{project.stars}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork size={10} />{" "}
                      <span className="num-display">{project.forks}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => router.push(`/extract?repo=${project.repoUrl?.replace("https://github.com/", "") || ""}`)}
                    disabled={!project.repoUrl}
                    className="bg-ossuary-panel border border-ossuary-border px-3 py-1.5 text-[10px] font-bold tracking-wider text-ossuary-white hover:bg-ossuary-yellow hover:text-ossuary-black hover:border-ossuary-yellow transition-all flex items-center gap-1.5 disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <Download size={10} />
                    EXTRACT
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mb-10">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="border border-ossuary-border px-3 py-1.5 text-[10px] font-bold tracking-wider text-ossuary-grey hover:text-ossuary-white hover:border-ossuary-yellow disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            {"< "}PREV
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => {
              if (p === 1) return true;
              if (page < 5) return p <= 5;
              return p >= page - 2 && p <= page + 2;
            })
            .map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`w-8 h-8 text-[10px] font-bold font-mono border transition-all ${
                  p === page
                    ? "bg-ossuary-yellow text-ossuary-black border-ossuary-yellow"
                    : "border-ossuary-border text-ossuary-grey hover:text-ossuary-white hover:border-ossuary-yellow"
                }`}
              >
                {p}
              </button>
            ))}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="border border-ossuary-border px-3 py-1.5 text-[10px] font-bold tracking-wider text-ossuary-grey hover:text-ossuary-white hover:border-ossuary-yellow disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            NEXT{"> "}
          </button>
        </div>
      )}

      {/* Pagination bar visual (kept for aesthetic) */}
      {!loading && totalPages <= 1 && (
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center gap-1">
            <div className="w-12 h-1 bg-ossuary-border" />
            <div className="w-4 h-1 bg-ossuary-greyDark" />
            <div className="w-32 h-1 bg-ossuary-yellow" />
            <div className="w-12 h-1 bg-ossuary-border" />
          </div>
        </div>
      )}
    </div>
  );
}

function Code2Mono({ size, className }: { size: number; className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
