"use client";

import dynamic from "next/dynamic";

const WishlistGrid = dynamic(
  () => import("./wishlist-card").then((mod) => mod.WishlistGrid),
  {
    ssr: false,
    loading: () => <div className="h-[200px] w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function WishlistGridLoader(props: any) {
  return <WishlistGrid {...props} />;
}