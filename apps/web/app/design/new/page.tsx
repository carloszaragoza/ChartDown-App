import { notFound } from "next/navigation";
import { NewVersionProposal } from "./NewVersionProposal";

// The new-version proposal, drawn with Astryx, for review. Development and preview builds only.
export default function NewVersionProposalPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <NewVersionProposal />;
}
