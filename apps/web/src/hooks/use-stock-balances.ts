import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios";
import type { StockBalance, StockBalanceItem, StockBalanceListResponse, StockBalanceResponse } from "@kwinna/contracts";

export function useStockBalances() {
  const { data, isLoading } = useQuery({
    queryKey: ["stock-balances"],
    queryFn: async () => {
      const res = await apiClient.get<StockBalanceListResponse>("/stock-balances");
      return res.data.data;
    },
  });

  return { balances: data ?? [], isLoading };
}

export function useStockBalance(id: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ["stock-balances", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<StockBalanceResponse>(`/stock-balances/${id}`);
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
      const res = await apiClient.post<StockBalanceResponse>("/stock-balances", { notes });
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
    mutationFn: async ({ id, items }: { id: string; items: Pick<StockBalanceItem, "productId" | "size" | "countedQuantity">[] }) => {
      await apiClient.patch(`/stock-balances/${id}`, { items });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["stock-balances", variables.id] });
    },
  });
}

export function useCompleteStockBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, items }: { id: string; items: Pick<StockBalanceItem, "productId" | "size" | "countedQuantity">[] }) => {
      const res = await apiClient.post<StockBalanceResponse>(`/stock-balances/${id}/complete`, { items });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-balances"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}

export function useCancelStockBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<StockBalanceResponse>(`/stock-balances/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-balances"] });
    },
  });
}
