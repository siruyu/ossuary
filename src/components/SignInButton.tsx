"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

export default function SignInButton() {
  const { data: session, status } = useSession();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);

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
  }, [fetchUserImage, avatarVersion]);

  useEffect(() => {
    const handler = () => setAvatarVersion((v) => v + 1);
    window.addEventListener("avatar-updated", handler);
    return () => window.removeEventListener("avatar-updated", handler);
  }, []);

  if (status === "loading") {
    return (
      <div className="w-8 h-8 bg-ossuary-border animate-pulse rounded-full" />
    );
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="border border-ossuary-yellow/40 text-ossuary-yellow text-[10px] font-bold tracking-wider px-3 py-1.5 hover:bg-ossuary-yellow hover:text-ossuary-black transition-colors cursor-pointer rounded-sm"
      >
        LOGIN / SIGNUP
      </Link>
    );
  }

  const user = session.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/settings"
        className="w-8 h-8 bg-ossuary-yellow text-ossuary-black flex items-center justify-center text-[10px] font-bold tracking-wider cursor-pointer hover:bg-yellow-400 transition-colors rounded-full"
        title={user?.name || "Unknown"}
      >
        {userImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={userImage}
            alt="avatar"
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          initials
        )}
      </Link>
      <button
        onClick={() => signOut()}
        className="text-ossuary-grey hover:text-ossuary-yellow transition-colors"
        title="Sign out"
      >
        <LogOut size={14} />
      </button>
    </div>
  );
}
