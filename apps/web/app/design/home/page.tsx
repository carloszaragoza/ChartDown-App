import { notFound } from "next/navigation";
import { HomeProposal } from "./HomeProposal";

// The home proposal, drawn with Astryx, for review. Development and preview builds only.
export default function HomeProposalPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <HomeProposal />;
}
