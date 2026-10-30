import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: { default: "CMS Commander — Meeting Governance", template: "%s | CMS Commander" },
  description: "Enterprise-grade meeting governance, calendar, agenda collaboration, and AI-powered summaries.",
  keywords: ["meeting", "governance", "calendar", "agenda", "minutes", "AI", "CMS Commander"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-[#F9FAFB] text-[#111827]">
        <div className="flex h-dvh overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto relative bg-[#F9FAFB]">
            <div className="relative z-10 h-full">
              {children}
            </div>
          </main>
        </div>
        <Toaster
          theme="light"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              color: "#111827",
              boxShadow: "0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
              borderRadius: "10px",
              fontFamily: "Inter, sans-serif",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
