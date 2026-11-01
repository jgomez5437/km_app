"use client";

import dynamic from "next/dynamic";

const NexusWorkbench = dynamic(
  () =>
    import("@/components/layout/NexusWorkbench").then(
      (mod) => mod.NexusWorkbench
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen bg-[#06080F] flex items-center justify-center text-slate-400 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span className="font-medium tracking-tight text-slate-300">Launching Astro Vault...</span>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return <NexusWorkbench />;
}
