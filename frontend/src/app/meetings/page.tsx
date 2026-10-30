import type { Metadata } from "next";
import { MeetingsPage } from "@/components/meeting/MeetingsPage";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Interactive meeting calendar with drag-and-drop scheduling and conflict detection.",
};

export default function Page() {
  return <MeetingsPage />;
}
