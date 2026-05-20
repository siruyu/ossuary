"use client";

import { Suspense } from "react";
import Mausoleum from "../components/Mausoleum";

function Loading() {
  return (
    <div className="min-h-screen bg-black text-ossuary-green flex items-center justify-center">
      <p>Loading...</p>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <Mausoleum />
    </Suspense>
  );
}