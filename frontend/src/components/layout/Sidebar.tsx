"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  const isMeetings = pathname === "/" || pathname.startsWith("/meetings");

  return (
    <aside
      className="w-[72px] lg:w-[264px] flex-shrink-0 flex flex-col py-4 bg-white border-r border-[#E5E7EB] transition-all duration-200 z-30 select-none"
      aria-label="Application Sidebar"
    >
      {/* Brand Header */}
      <div className="px-3 lg:px-5 mb-6">
        <Link
          href="/meetings"
          className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249E5E] rounded-xl p-1"
          aria-label="CMS Commander Meeting Governance Dashboard"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-150 group-hover:scale-105 shadow-sm"
            style={{
              backgroundColor: "#249E5E",
              boxShadow: "0 2px 10px rgba(36,158,94,0.35)"
            }}
          >
            <ShieldCheck className="w-5 h-5 text-white" strokeWidth={1.75} />
          </div>
          <div className="hidden lg:block overflow-hidden">
            <p className="font-bold text-[#111827] text-sm leading-tight tracking-tight">CMS Commander</p>
            <p className="text-[11px] text-[#177042] font-semibold tracking-wider uppercase">Meeting Module</p>
          </div>
        </Link>
      </div>

      {/* Core Navigation */}
      <nav className="flex-1 px-2 lg:px-3 space-y-1.5" aria-label="Main Navigation">
        <div className="hidden lg:block px-3 py-1 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
          Workspace
        </div>

        <Link
          href="/meetings"
          className={cn(
            "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#249E5E]",
            isMeetings
              ? "bg-[#E8F7F0] text-[#177042] font-semibold shadow-xs border border-[#249E5E]/20"
              : "text-[#4B5563] hover:text-[#111827] hover:bg-[#F9FAFB] font-medium"
          )}
        >
          <CalendarDays
            className={cn(
              "w-[18px] h-[18px] flex-shrink-0 transition-colors",
              isMeetings ? "text-[#249E5E]" : "text-[#6B7280] group-hover:text-[#111827]"
            )}
            strokeWidth={1.75}
          />
          <span className="hidden lg:block">Meetings & Calendar</span>
        </Link>

        {/* Feature indicators in sidebar */}
        <div className="hidden lg:block pt-6 px-3 space-y-3">
          <div className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
            Governance Suite
          </div>
          <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] space-y-2 text-xs shadow-xs">
            <div className="flex items-center gap-2 text-[#374151] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#249E5E] ring-2 ring-[#E8F7F0]" />
              <span>Interactive Calendar & Drag/Drop</span>
            </div>
            <div className="flex items-center gap-2 text-[#374151] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#249E5E] ring-2 ring-[#E8F7F0]" />
              <span>Yjs CRDT Collaborative Notes</span>
            </div>
            <div className="flex items-center gap-2 text-[#374151] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#249E5E] ring-2 ring-[#E8F7F0]" />
              <span>Ollama AI Task Extraction</span>
            </div>
            <div className="flex items-center gap-2 text-[#374151] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#249E5E] ring-2 ring-[#E8F7F0]" />
              <span>SHA-256 MoM Sign-Off</span>
            </div>
          </div>
        </div>
      </nav>

      {/* User Profile */}
      <div className="px-2 lg:px-3 pt-3 border-t border-[#E5E7EB]">
        <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#249E5E]/30 transition-colors">
          <div className="relative">
            <div
              className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-[12px] font-bold text-[#177042] bg-[#E8F7F0] border border-[#249E5E]/20 shadow-xs"
            >
              MJ
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-[#16A34A]"
              title="Online"
            />
          </div>
          <div className="hidden lg:block min-w-0">
            <p className="text-[13px] font-semibold text-[#111827] truncate">Mukilan J</p>
            <p className="text-[11px] text-[#6B7280] truncate">Lead Architect / Host</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
