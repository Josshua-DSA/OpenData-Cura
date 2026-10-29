"use client";

import dynamic from "next/dynamic";

const CuraApp = dynamic(() => import("../App"), { ssr: false });

export default function HomePage() {
  return <CuraApp />;
}
