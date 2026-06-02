import { ManagedSite, SitePage } from "@prisma/client";

export interface SiteWithPages extends ManagedSite {
  pages: SitePage[];
}
