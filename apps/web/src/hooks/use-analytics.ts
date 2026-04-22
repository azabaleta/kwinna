"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAnalyticsSummary, type AnalyticsSummary } from "@/services/analytics";

export function useAnalyticsSummary(from: Date, to: Date) {
  const query = useQuery({
    queryKey: ["analytics", "summary", from.toISOString(), to.toISOString()],
    queryFn:  () => fetchAnalyticsSummary(from, to),
    staleTime: 60_000, // 1 minuto
  });

  const empty: AnalyticsSummary = {
    shopViews: 0, cartAdds: 0, checkoutStarts: 0, saleCompletes: 0,
  };

  return {
    summary:   query.data ?? empty,
    isLoading: query.isLoading,
    isError:   query.isError,
  };
}
