import { notFound } from "next/navigation";
import { SetsProposal } from "./SetsProposal";

// The sets proposal, drawn with Astryx, for review. Development and preview builds only.
export default function SetsProposalPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <SetsProposal />;
}
