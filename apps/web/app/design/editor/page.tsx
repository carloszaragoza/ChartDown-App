import { notFound } from "next/navigation";
import { EditorProposal } from "./EditorProposal";

// The Chart editor list proposal, drawn with Astryx, for review. Development and preview only.
export default function EditorProposalPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <EditorProposal />;
}
