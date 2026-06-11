import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poker Ledger",
    short_name: "Poker Ledger",
    description:
      "Track poker buy-ins and cash-outs, verify the chips balance, and settle up with the fewest payments.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f4f5",
    theme_color: "#059669",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
