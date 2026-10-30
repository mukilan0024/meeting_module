import type { Metadata } from "next";
import { MeetingWorkspace } from "@/components/meeting/MeetingWorkspace";

export const metadata: Metadata = { title: "Meeting Workspace" };

export default function Page({ params }: { params: { id: string } }) {
  return <MeetingWorkspace meetingId={params.id} />;
}
