import { prisma } from "@/lib/prisma";
import { LinkGrid } from "@/components/links/link-grid";

export default async function LinksPage() {
  const links = await prisma.savedLink.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10">
      <LinkGrid links={links} />
    </div>
  );
}