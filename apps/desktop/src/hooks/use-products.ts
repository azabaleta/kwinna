import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "../services/products";
import { productKeys } from "./query-keys";

export function useProducts() {
  const query = useQuery({
    queryKey: productKeys.all,
    queryFn:  fetchProducts,
    staleTime: 5 * 60_000, // catálogo cambia poco durante una sesión
  });

  return {
    products:  query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
  };
}
