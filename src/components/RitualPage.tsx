"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, FolderOpen, Save, AlertTriangle, LogIn, ShieldAlert } from "lucide-react";
import TerminalText from "./TerminalText";

const STEPS = [
  { key: "01", label: "INCEPTION" },
  { key: "02", label: "EXCAVATION" },
  { key: "03", label: "INSCRIPTION" },
  { key: "04", label: "INTERMENT" },
];

interface RepoData {
  id: string;
  name: string;
  description: string;
  lastCommit: string;
  tags: string[];
  html_url?: string;
  stars?: number;
  forks?: number;
  language?: string;
  topics?: string[];
}

const FAILURE_CLASSIFICATIONS = [
  "MARKET_SHIFT",
  "LACK_OF_FUNDING",
  "TECHNICAL_DEBT",
  "PASSION_FADED",
];

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
          AUTHENTICATION REQUIRED TO PERFORM A BURIAL RITUAL. ESTABLISH
          A SESSION TO BEGIN INTERMENT PROCEDURES.
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

export default function RitualPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = session?.user?.id;
  const loggedIn = status === "authenticated" && !!userId;

  const [step, setStep] = useState(0);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [failureMode, setFailureMode] = useState("");
  const [obituary, setObituary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [realRepos, setRealRepos] = useState<RepoData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [buriedRepoNames, setBuriedRepoNames] = useState<string[]>([]);

  const connected = searchParams.get("connected");

  // Check GitHub connection status on initial load
  useEffect(() => {
    if (!loggedIn) return;
    
    setIsLoadingRepos(true);
    fetch("/api/github/repos")
      .then((res) => res.json())
      .then((data) => {
        setIsConnected(data.connected);
        setBuriedRepoNames(data.buriedRepoNames || []);
        if (data.connected && data.repos?.length > 0) {
          setRealRepos(data.repos);
        }
        // Only advance if returned from OAuth
        if (connected === "true" && data.connected && step === 0) {
          setStep(1);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingRepos(false));
  }, [loggedIn]);

  const repos = realRepos;
  const selectedRepoData = repos.find((r) => r.id === selectedRepo);

  async function handleBurial() {
    if (!selectedRepoData || !failureMode || !obituary.trim() || !userId) return;

    const repoName = selectedRepoData.html_url 
      ? selectedRepoData.html_url.replace("https://github.com/", "")
      : selectedRepoData.name;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/burial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          repo: { ...selectedRepoData, name: repoName },
          failureMode,
          obituary: obituary.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Burial failed with status ${res.status}`);
      }

      setStep(3);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "UNKNOWN_ERROR");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRestart() {
    router.push("/necromancer");
  }

  async function handleDisconnect() {
    try {
      const res = await fetch("/api/connect-github", { method: "DELETE" });
      if (res.ok) {
        setIsConnected(false);
        setRealRepos([]);
        setStep(0);
        router.refresh();
      }
    } catch (error) {
      console.error("Disconnect failed:", error);
    }
  }

  if (!loggedIn) return <NotLoggedIn />;

  const stepsContent = [
    <StepConnect key="c1" isConnected={isConnected} onConnect={() => setStep(1)} onDisconnect={handleDisconnect} />,
    <StepExcavate key="c2" repos={repos} isConnected={isConnected} isLoading={isLoadingRepos} selected={selectedRepo} onSelect={setSelectedRepo} onNext={() => setStep(2)} onDisconnect={handleDisconnect} buriedRepoNames={buriedRepoNames} />,
    <StepInscription
      key="c3"
      repo={selectedRepoData}
      failureMode={failureMode}
      setFailureMode={setFailureMode}
      obituary={obituary}
      setObituary={setObituary}
      onNext={handleBurial}
      isSubmitting={isSubmitting}
      submitError={submitError}
      onAbort={() => router.push("/")}
    />,
    <StepInterment
      key="c4"
      repo={selectedRepoData}
      failureMode={failureMode}
      obituary={obituary}
      onRestart={handleRestart}
    />,
  ];

  return (
    <div className="p-6">
      {/* Progress indicator */}
      <div className="flex items-center mb-10">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1">
            <div
              className={`flex flex-col items-center w-24 ${
                i <= step ? "" : "opacity-30"
              }`}
            >
              <span
                className={`text-[11px] font-bold px-3 py-1 ${
                  i === step
                    ? "bg-ossuary-yellow text-ossuary-black"
                    : i < step
                    ? "bg-ossuary-yellow/20 text-ossuary-yellow"
                    : "bg-ossuary-panel text-ossuary-greyDark"
                }`}
              >
                {s.key}
              </span>
              <span className="text-[9px] tracking-wider text-ossuary-grey mt-1 uppercase">
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px bg-ossuary-border mx-3" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {stepsContent[step]}
    </div>
  );
}

function StepConnect({ isConnected, onConnect, onDisconnect }: { isConnected: boolean; onConnect: () => void; onDisconnect: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Left: Connect */}
      <div>
        <div className="text-[10px] text-ossuary-yellow tracking-widest uppercase mb-2">
          PHASE_01: SOURCE_LINK
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-4 leading-tight">
          CONNECT_THE{"\n"}
          <TerminalText text="GITHUB_ACCOUNT" speed={60} />
        </h1>
        <p className="text-[11px] text-ossuary-grey leading-relaxed mb-6 max-w-md">
          TO BEGIN THE RITUAL, WE MUST BRIDGE THE DIGITAL DIVIDE. GRANT US ACCESS TO YOUR GITHUB ACCOUNT SO WE CAN SCAN YOUR REPOSITORIES AND SELECT THE PROJECT FOR INTERMENT.
        </p>

        {isConnected ? (
          <div className="flex items-center gap-3">
            <button
              onClick={onConnect}
              className="bg-green-600 text-white text-[11px] font-bold tracking-wider px-6 py-3 flex items-center gap-2 hover:bg-green-500 transition-colors"
            >
              <Check size={14} />
              GITHUB_CONNECTED
              <ArrowRight size={14} />
            </button>
            <button
              onClick={onDisconnect}
              className="border border-red-800 text-red-400 text-[11px] font-bold tracking-wider px-4 py-3 hover:bg-red-900/20 transition-colors"
            >
              DISCONNECT
            </button>
          </div>
        ) : (
          <button
            onClick={() => window.location.href = "/api/connect-github"}
            className="bg-ossuary-white text-ossuary-black text-[11px] font-bold tracking-wider px-6 py-3 flex items-center gap-2 hover:bg-ossuary-yellow transition-colors"
          >
            <GithubSvg size={14} />
            CONNECT_YOUR_GITHUB
            <ArrowRight size={14} />
          </button>
        )}

        <div className="mt-6 border border-ossuary-border p-4">
          <div className="text-[9px] text-ossuary-greyDark tracking-wider mb-2">
            AUTH_FLOW_STATUS
          </div>
          <div className="text-[10px] text-ossuary-grey leading-relaxed">
            SIGN_IN(&quot;GITHUB&quot;) FROM NEXT-AUTH/REACT<br />
            OAUTH SCOPES: REPO:STATUS, READ:USER<br />
            TOKEN_STORED SERVER-SIDE &rarr; USED TO FETCH_INACTIVE_REPOS
          </div>
        </div>
      </div>

      {/* Right: Terminal status */}
      <div className="bg-ossuary-panel border border-ossuary-border p-4 font-mono text-[11px]">
        {isConnected ? (
          <>
            <div className="text-green-500 mb-1">{"> "} GITHUB_ACCOUNT_LINKED</div>
            <div className="text-ossuary-greyDark mt-3">{"> "} SCANNING_YOUR_REPOSITORIES...</div>
            <div className="text-ossuary-greyDark mt-1">{"> "} READY_TO_EXCAVATE_ARTIFACTS</div>
          </>
        ) : (
          <>
            <div className="text-ossuary-yellow mb-1">{"> "} AWAITING_GITHUB_CONNECTION...</div>
            <div className="text-ossuary-greyDark mt-3">{"> "} ONCE_CONNECTED_WE_WILL_SCAN_FOR_INACTIVE_REPOS</div>
            <div className="text-ossuary-greyDark mt-1">{"> "} LOOKING_FOR_PROJECTS_WITH_NO_COMMITS_IN_6+_MONTHS</div>
            <div className="text-ossuary-greyDark mt-4 mb-2">{"> "} CLICK_CONNECT_TO_AUTHORIZE</div>
          </>
        )}
        <div className="text-ossuary-greyDark mt-3 text-[9px] leading-relaxed break-all opacity-40">
          {"<>".repeat(80)}
        </div>
      </div>
    </div>
  );
}

function StepExcavate({
  repos,
  isConnected,
  isLoading,
  selected,
  onSelect,
  onNext,
  onDisconnect,
  buriedRepoNames,
}: {
  repos: RepoData[];
  isConnected: boolean;
  isLoading: boolean;
  selected: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  onDisconnect: () => void;
  buriedRepoNames: string[];
}) {
  const isBuried = (repoName: string) => buriedRepoNames.includes(repoName.toLowerCase());
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[10px] text-ossuary-grey tracking-widest uppercase">
            ANALYSIS_LOG: EXCAVATE_ARTIFACTS
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-1">
            SELECT_ONE_FOR_BURIAL
          </h2>
        </div>
        {isLoading && (
          <div className="text-[10px] text-ossuary-yellow">
            SCANNING_GITHUB_REPOSITORIES...
          </div>
        )}
        {isConnected && !isLoading && (
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-green-500 border border-green-500 px-3 py-1">
              GITHUB_CONNECTED
            </div>
            <button
              onClick={onDisconnect}
              className="text-[9px] text-red-400 border border-red-800 px-2 py-1 hover:bg-red-900/20 transition-colors"
            >
              DISCONNECT
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-px bg-ossuary-border border border-ossuary-border mb-8">
        {repos.map((repo) => {
          const buried = isBuried(repo.name);
          return (
            <div
              key={repo.id}
              onClick={() => !buried && onSelect(repo.id)}
              className={`bg-[#060606] p-6 transition-all ${
                buried
                  ? "opacity-40 cursor-not-allowed"
                  : selected === repo.id
                  ? "border-b-2 border-b-ossuary-yellow cursor-pointer"
                  : "cursor-pointer hover:bg-ossuary-panel/50"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                {buried ? (
                  <Check size={20} className="text-ossuary-greyDark" />
                ) : (
                  <FolderOpen size={20} className="text-ossuary-yellow" />
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-ossuary-greyDark">LAST_COMMIT: {repo.lastCommit}</span>
                  {selected === repo.id && (
                    <Check size={14} className="text-ossuary-yellow" />
                  )}
                </div>
              </div>
              <h3 className={`text-base font-bold mb-2 ${buried ? "line-through text-ossuary-greyDark" : "underline underline-brutal"}`}>
                {repo.name}
              </h3>
              <p className="text-[10px] text-ossuary-grey leading-relaxed mb-3">
                {repo.description}
              </p>
              {buried && (
                <div className="text-[9px] text-red-400 border border-red-900/50 px-2 py-1 mb-3">
                  ALREADY_BURIED
                </div>
              )}
              <div className="flex gap-1.5">
                {repo.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] text-ossuary-grey border border-ossuary-border px-2 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button
        disabled={!selected}
        onClick={onNext}
        className={`text-[11px] font-bold tracking-wider px-6 py-3 flex items-center gap-2 transition-all ${
          selected
            ? "bg-ossuary-yellow text-ossuary-black cursor-pointer"
            : "bg-ossuary-panel text-ossuary-greyDark cursor-not-allowed"
        }`}
      >
        PROCEED_TO_INSCRIPTION
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

function StepInscription({
  repo,
  failureMode,
  setFailureMode,
  obituary,
  setObituary,
  onNext,
  isSubmitting,
  submitError,
  onAbort,
}: {
  repo: RepoData | undefined;
  failureMode: string;
  setFailureMode: (f: string) => void;
  obituary: string;
  setObituary: (o: string) => void;
  onNext: () => void;
  isSubmitting: boolean;
  submitError: string | null;
  onAbort: () => void;
}) {
  const canSubmit = !!repo && !!failureMode && !!obituary.trim();

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Left: Write */}
      <div>
        <div className="text-[10px] text-ossuary-yellow tracking-widest uppercase mb-2">
          LOG_TYPE: FINAL_INSCRIPTION
        </div>
        <h2 className="text-3xl font-black tracking-tight mb-4">
          WRITE_THE{"\n"}
          OBITUARY
        </h2>
        <p className="text-[10px] text-ossuary-grey leading-relaxed mb-6 max-w-sm">
          BE HONEST. WHY DID IT DIE? WAS IT NEGLECT, TECHNICAL DEBT, OR A LACK OF FUNDING? YOUR WORDS WILL SERVE AS A WARNING AND A GUIDE TO FUTURE SCAVENGERS.
        </p>

        <textarea
          value={obituary}
          onChange={(e) => setObituary(e.target.value)}
          placeholder="ENTER SYSTEM DIAGNOSTICS AND FAILURE ANALYSIS..."
          rows={8}
          className="w-full terminal-input text-[11px] leading-relaxed resize-none"
        />

        <div className="mt-4 flex items-center gap-2 text-[10px] text-ossuary-yellow">
          <Save size={14} />
          PRESERVING_LEGACY_892
        </div>
      </div>

      {/* Right: Classification */}
      <div>
        {repo && (
          <>
            <div className="text-[10px] text-ossuary-grey tracking-widest uppercase mb-1">
              PROJECT_IDENTIFIER
            </div>
            <h3 className="text-2xl font-black text-ossuary-yellow mb-6">
              {repo.name}
            </h3>
          </>
        )}

        <div className="text-[10px] text-ossuary-grey tracking-widest uppercase mb-3">
          FAILURE_CLASSIFICATION
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {FAILURE_CLASSIFICATIONS.map((fc) => (
            <button
              key={fc}
              onClick={() => setFailureMode(fc)}
              className={`text-[10px] font-bold tracking-wider px-3 py-2 transition-all ${
                failureMode === fc
                  ? "bg-ossuary-yellow text-ossuary-black"
                  : "border border-ossuary-border text-ossuary-grey hover:border-ossuary-yellow"
              }`}
            >
              {fc}
            </button>
          ))}
        </div>

        <div className="text-[10px] text-ossuary-grey tracking-widest uppercase mb-3">
          POST_MORTEM_NARRATIVE
        </div>
        <div className="border border-ossuary-border p-3 min-h-[120px] text-[11px] text-ossuary-grey leading-relaxed">
          {obituary || (
            <span className="text-ossuary-greyDark">
              ENTER SYSTEM DIAGNOSTICS AND FAILURE ANALYSIS...
            </span>
          )}
        </div>
      </div>

      {/* Error state */}
      {submitError && (
        <div className="col-span-2 border border-red-900/50 bg-red-950/20 p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <div>
            <div className="text-[10px] text-red-400 font-bold tracking-wider uppercase">
              BURIAL_TRANSMISSION_FAILED
            </div>
            <div className="text-[10px] text-red-300/70 mt-1">
              {submitError}
            </div>
          </div>
        </div>
      )}

      {/* Bottom: Complete Burial */}
      <div className="col-span-2 border-t border-ossuary-border pt-8 flex items-center justify-between">
        <div>
          <div className="text-2xl font-black text-ossuary-yellow mb-2">
            COMPLETE_BURIAL
          </div>
          <p className="text-[10px] text-ossuary-grey max-w-lg leading-relaxed">
            ONCE COMMITTED, THE CODE WILL BE PRESERVED IN THE ARCHIVE FOREVER. OTHERS MAY LOOT ITS FUNCTIONS, BUT THE PROJECT AS A WHOLE WILL REST HERE.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onNext}
            disabled={!canSubmit || isSubmitting}
            className={`text-[11px] font-bold tracking-wider px-6 py-3 flex items-center gap-2 transition-all ${
              canSubmit && !isSubmitting
                ? "bg-ossuary-yellow text-ossuary-black cursor-pointer hover:brightness-110"
                : "bg-ossuary-panel text-ossuary-greyDark cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="animate-pulse">PRESERVING...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                COMMIT_BURIAL_SEQ
              </>
            )}
          </button>
          <button
            onClick={onAbort}
            className="border border-ossuary-border text-ossuary-grey text-[11px] font-bold tracking-wider px-6 py-3 hover:text-ossuary-red hover:border-ossuary-red transition-all"
          >
            ABORT_RITUAL
          </button>
        </div>
      </div>
    </div>
  );
}

function StepInterment({
  repo,
  failureMode,
  obituary,
  onRestart,
}: {
  repo: RepoData | undefined;
  failureMode: string;
  obituary: string;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="text-ossuary-yellow mb-4">
        <Check size={48} />
      </div>
      <h2 className="text-4xl font-black tracking-tight mb-4">
        BURIAL_COMPLETE
      </h2>
      <p className="text-[11px] text-ossuary-grey text-center max-w-md leading-relaxed mb-2">
        <span className="text-ossuary-yellow font-bold">{repo?.name}</span> HAS BEEN INTERRED IN THE
        MAUSOLEUM. ITS REMAINS ARE NOW AVAILABLE FOR EXTRACTION BY OTHER NECROMANCERS.
      </p>
      <div className="flex items-center gap-3 mt-4 text-[10px] text-ossuary-grey">
        <span className="border border-ossuary-border px-3 py-1">
          FAILURE: {failureMode}
        </span>
        <span className="border border-ossuary-border px-3 py-1">
          OBITUARY: {obituary.length} CHARS
        </span>
      </div>
      <button
        onClick={onRestart}
        className="mt-8 border border-ossuary-border text-ossuary-yellow text-[11px] font-bold tracking-wider px-6 py-3 hover:bg-ossuary-yellow hover:text-ossuary-black transition-all"
      >
        COMMENCE_ANOTHER_RITUAL
      </button>
    </div>
  );
}

function GithubSvg({ size }: { size: number }) {
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
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}
