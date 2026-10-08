import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { LoginPage } from "@/pages/LoginPage";

const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const UsersPage = lazy(() => import("@/pages/users/UsersPage").then((m) => ({ default: m.UsersPage })));
const UserDetailPage = lazy(() => import("@/pages/users/UserDetailPage").then((m) => ({ default: m.UserDetailPage })));
const VenuesPage = lazy(() => import("@/pages/venues/VenuesPage").then((m) => ({ default: m.VenuesPage })));
const VenueFormPage = lazy(() => import("@/pages/venues/VenueFormPage").then((m) => ({ default: m.VenueFormPage })));
const FoundItemsPage = lazy(() => import("@/pages/items/FoundItemsPage").then((m) => ({ default: m.FoundItemsPage })));
const LostItemsPage = lazy(() => import("@/pages/items/LostItemsPage").then((m) => ({ default: m.LostItemsPage })));
const ClaimsPage = lazy(() => import("@/pages/claims/ClaimsPage").then((m) => ({ default: m.ClaimsPage })));
const ClaimDetailPage = lazy(() => import("@/pages/claims/ClaimDetailPage").then((m) => ({ default: m.ClaimDetailPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1, refetchOnWindowFocus: false },
  },
});

function Loader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<AuthGuard />}>
              <Route element={<AdminLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/users/:id" element={<UserDetailPage />} />
                <Route path="/venues" element={<VenuesPage />} />
                <Route path="/venues/new" element={<VenueFormPage />} />
                <Route path="/venues/:slug/edit" element={<VenueFormPage />} />
                <Route path="/found-items" element={<FoundItemsPage />} />
                <Route path="/lost-items" element={<LostItemsPage />} />
                <Route path="/claims" element={<ClaimsPage />} />
                <Route path="/claims/:id" element={<ClaimDetailPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
