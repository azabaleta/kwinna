import { useState, useEffect, useRef } from "react";
import type { CustomerSearchResult } from "@kwinna/contracts";
import { searchCustomers } from "../services/pos-customers";

export function useCustomerSearch() {
  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState<CustomerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchCustomers(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer.current);
  }, [query]);

  function clearResults() {
    setResults([]);
    setQuery("");
  }

  return { query, setQuery, results, isSearching, clearResults };
}
