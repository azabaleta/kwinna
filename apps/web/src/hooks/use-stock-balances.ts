import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { StockBalance, StockBalanceListResponse, StockBalanceResponse } from "@kwinna/contracts";

export function useStockBalances() {
  const { data, isLoading } = useQuery({
    queryKey: ["stock-balances"],
    queryFn: async () => {
      const res = await api.get<StockBalanceListResponse>("/stock-balances");
      return res.data.data;
    },
  });

  return { balances: data || [], isLoading };
}

export function useStockBalance(id: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ["stock-balances", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get<StockBalanceResponse>(`/stock-balances/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  return { balance: data, isLoading };
}

export function useCreateStockBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notes?: string) => {
      const res = await api.post<StockBalanceResponse>("/stock-balances", { notes });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-balances"] });
    },
  });
}

export function useUpdateStockBalanceDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, items }: { id: string, items: any[] }) => {
      await api.patch(`/stock-balances/${id}`, { items });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stock-balances", variables.id] });
    },
  });
}

export function useCompleteStockBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, items }: { id: string, items: any[] }) => {
      const res = await api.post<StockBalanceResponse>(`/stock-balances/${id}/complete`, { items });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-balances"] });
      // Invalidate stock and movements since they are altered
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}
