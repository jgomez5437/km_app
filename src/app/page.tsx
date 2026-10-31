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
      <div className="h-screen w-screen bg-[#0d1117] flex items-center justify-center text-gray-400 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span>Initializing Nexus Vault...</span>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return <NexusWorkbench />;
}
