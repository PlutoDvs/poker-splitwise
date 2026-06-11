import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poker Ledger",
    short_name: "Poker Ledger",
    description:
      "Track poker buy-ins and cash-outs, verify the chips balance, and settle up with the fewest payments.",
    start_url: "/",
    display: "standalone",
    background_color: "#1b1c20",
    theme_color: "#1b1c20",
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
