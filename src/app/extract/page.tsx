"use client";

import { Suspense } from "react";
import ExtractPage from "../../components/ExtractPage";

function Loading() {
  return (
    <div className="min-h-screen bg-black text-ossuary-green flex items-center justify-center">
      <p>Loading...</p>
    </div>
  );
}

export default function ExtractPageWrapper() {
  return (
    <Suspense fallback={<Loading />}>
      <ExtractPage />
    </Suspense>
  );
}