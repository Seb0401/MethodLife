import { PageSkeleton } from "@/components/ui/skeleton";

// Suspense fallback for every page under (app). Because the sidebar layout is
// preserved across navigation, switching tabs swaps only this content area:
// the skeleton shows instantly while the new page's data loads on the server,
// so navigation feels immediate even over a slow DB round-trip.
export default function AppLoading() {
  return <PageSkeleton />;
}
