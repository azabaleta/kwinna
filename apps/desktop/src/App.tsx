import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/use-auth-store";
import AppShell from "./components/layout/AppShell";
import LoginView from "./views/LoginView";
import SearchView from "./views/SearchView";
import SellView from "./views/SellView";
import ReturnView from "./views/ReturnView";
import OrdersView from "./views/OrdersView";

function PrivateRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/search" replace />} />
        <Route path="/search" element={<SearchView />} />
        <Route path="/sell" element={<SellView />} />
        <Route path="/return" element={<ReturnView />} />
        <Route path="/orders" element={<OrdersView />} />
        <Route path="*" element={<Navigate to="/search" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  const token = useAuthStore((s) => s.token);

  return (
    <BrowserRouter>
      {token ? <PrivateRoutes /> : <LoginView />}
    </BrowserRouter>
  );
}
