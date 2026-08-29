import type { Metadata } from "next";

/**
 * `app/admin/page.tsx` is a client component and therefore cannot export
 * `metadata`. This server layout carries it instead — its only job is to keep
 * the private telemetry dashboard out of every index.
 */
export const metadata: Metadata = {
  title: "Telemetry",
  description:
    "Private telemetry dashboard. Reads only what this browser already stored locally.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  // Do not advertise a canonical for a page that must never be indexed.
  alternates: { canonical: null },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
