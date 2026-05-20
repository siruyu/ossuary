"use client";

import { useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Command } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = useCallback((val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("IDENTITY_KEY is mandatory.");
      return;
    }

    if (!validateEmail(email)) {
      setError("IDENTITY_KEY format rejected. Use valid hash format.");
      return;
    }

    if (password.length < 6) {
      setError("SECRET_PHRASE too weak. Min 6 characters required.");
      return;
    }

    if (isSignup && !name.trim()) {
      setError("DESIGNATION required for new records.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        name: isSignup ? name : undefined,
        mode: isSignup ? "signup" : "login",
        redirect: false,
      });

      if (result?.error) {
        setError(
          isSignup
            ? "RECORD_EXISTS. Access denied for duplicate identity."
            : "AUTH_FAILED. Invalid credentials."
        );
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("CONNECTION_REFUSED. Session initialization failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await signIn("github", { redirect: true, callbackUrl: "/" });
    } catch {
      setError("EXTERNAL_PROVIDER unavailable.");
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        .bg-grid-pattern {
          background-image: linear-gradient(
              rgba(255, 255, 255, 0.03) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.03) 1px,
              transparent 1px
            );
          background-size: 30px 30px;
        }
      `}</style>

      <div className="min-h-screen bg-ossuary-black text-ossuary-white flex flex-col items-center justify-center font-mono bg-grid-pattern">
        {/* ---- Main Content ---- */}
        <main className="flex-1 flex items-center justify-center px-4 relative">
          {/* Terminal Auth Card */}
          <div
            className="w-full max-w-md rounded-lg overflow-hidden border border-ossuary-border"
            style={{ backgroundColor: "#1a1a1a" }}
          >
            {/* Terminal Header */}
            <div
              className="flex items-center justify-between px-4 py-2.5 border-b border-ossuary-border"
              style={{ backgroundColor: "#2b2b2b" }}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8B3A3A] inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#6b6b6b] inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#3A8B3A] inline-block" />
              </div>
              <span className="text-[11px] text-ossuary-grey tracking-wider">
                AUTH.TERMINAL.01
              </span>
              <span className="text-[10px] text-cyan-400 tracking-wider">
                SECURE_LINK: ESTABLISHED
              </span>
            </div>

            {/* Form Body */}
            <div className="p-8">
              <h1 className="text-4xl font-bold tracking-wide text-ossuary-white mb-2">
                {isSignup ? "AUTH.REGISTER" : "AUTH.LOGIN"}
              </h1>
              <p className="text-[11px] text-ossuary-greyDark mb-8 tracking-wider">
                {isSignup
                  ? "NEW RECORD CREATION REQUESTED. PROVIDE CREDENTIALS FOR SYSTEM ENTRY."
                  : "SYSTEM IDENTIFICATION REQUIRED FOR REPOSITORY EXHUMATION."}
              </p>

              {/* Error message */}
              {error && (
                <div className="mb-5 px-3 py-2 border border-red-900/50 bg-red-950/20 text-[10px] text-red-400 tracking-wider animate-pulse">
                  {"[ERROR] "}
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name field (signup only) */}
                {isSignup && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-cyan-400 tracking-wider">
                      [ PARAMETER: DESIGNATION ]
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="NECROMANCER_NAME"
                      className="terminal-input w-full text-sm tracking-wider"
                      autoComplete="name"
                    />
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-cyan-400 tracking-wider">
                    {isSignup ? "[ PARAMETER: IDENTITY_KEY ]" : "[ PARAMETER: IDENTITY_KEY ]"}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="USER_HASH / EMAIL"
                    className="terminal-input w-full text-sm tracking-wider"
                    autoComplete="email"
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-cyan-400 tracking-wider">
                    {isSignup
                      ? "[ PARAMETER: SECRET_PHRASE ]"
                      : "[ PARAMETER: SECRET_PHRASE ]"}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                    className="terminal-input w-full text-sm tracking-wider"
                    autoComplete={
                      isSignup
                        ? "new-password"
                        : "current-password"
                    }
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-ossuary-yellow text-ossuary-black text-[11px] font-bold tracking-[0.3em] py-3.5 hover:brightness-110 transition-all uppercase disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading
                    ? "PROCESSING..."
                    : isSignup
                    ? "GENERATE_ACCESS"
                    : "INITIALIZE_SESSION"}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-ossuary-border" />
                <span className="text-[10px] text-ossuary-greyDark tracking-wider whitespace-nowrap">
                  OR EXTERNAL PROVIDER
                </span>
                <div className="flex-1 h-px bg-ossuary-border" />
              </div>

              {/* GitHub OAuth */}
              <button
                type="button"
                onClick={handleGithubLogin}
                disabled={loading}
                className="w-full border border-ossuary-border text-ossuary-grey text-[11px] font-medium tracking-wider py-3 flex items-center justify-center gap-2 hover:border-ossuary-yellow hover:text-ossuary-white transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Command size={16} />
                GITHUB_OAUTH_SEANCE
              </button>

              {/* Toggle link */}
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignup(!isSignup);
                    setError("");
                  }}
                  className="text-[11px] text-ossuary-greyDark tracking-wider hover:text-ossuary-yellow transition-colors"
                >
                  {isSignup
                    ? "RECORD_EXISTS? "
                    : "NO_RECORD_FOUND? "}
                  <span className="text-green-400 font-bold">
                    {isSignup ? "INITIALIZE_SESSION" : "GENERATE_ACCESS"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* ---- Footer ---- */}
        <footer className="border-t border-ossuary-border flex-shrink-0">
          <div className="flex items-center justify-between px-6 py-2">
            <div className="flex items-center gap-6">
              <span className="text-[10px] text-ossuary-greyDark tracking-wider">
                IP_REDACTED:{" "}
                <span className="text-ossuary-grey">127.0.0.1</span>
              </span>
              <span className="text-[10px] text-ossuary-greyDark tracking-wider">
                PORT_STATUS:{" "}
                <span className="text-green-500/80">LISTENING</span>
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-[10px] text-ossuary-greyDark tracking-wider">
                LAST_PULSE:{" "}
                <span className="text-ossuary-yellow">0.002ms</span>
              </span>
              <span className="text-[10px] text-ossuary-greyDark tracking-wider">
                SESSION_TYPE:{" "}
                <span className="text-ossuary-grey">TRANSIENT</span>
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-2 border-t border-ossuary-border" style={{ backgroundColor: "#060606" }}>
            <span className="text-[10px] text-ossuary-greyDark tracking-wider">
              &copy; 2024 PROJECT_GRAVEYARD — EXPIRED CODE NEVER DIES
            </span>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-ossuary-greyDark tracking-wider">
                MANIFESTO
              </span>
              <span className="text-[10px] text-ossuary-greyDark tracking-wider">
                TERMINAL_API
              </span>
              <span className="text-[10px] text-ossuary-greyDark tracking-wider">
                DEATH_LOGS
              </span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
