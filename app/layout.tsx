import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/Shell";
export const metadata: Metadata = {
  title: {
    default: "Stillwater — A considered way of living",
    template: "%s | Stillwater",
  },
  description:
    "Discover a considered collection of residences in Bengaluru, Mumbai and Hyderabad. Architecture, landscape and everyday life, in balance.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
