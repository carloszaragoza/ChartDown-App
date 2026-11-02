import { notFound } from "next/navigation";
import { CatalogProposal } from "./CatalogProposal";

// The catalog proposal, drawn with Astryx, for review. Development and preview builds only.
export default function CatalogProposalPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <CatalogProposal />;
}
