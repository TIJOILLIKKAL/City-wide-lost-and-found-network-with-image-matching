import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

// Eagerly load auth pages — always on the critical path
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";

// Lazy-load everything else — split into separate chunks
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const FoundItemsPage = lazy(() => import("@/pages/items/FoundItemsPage").then((m) => ({ default: m.FoundItemsPage })));
const UploadFoundItemPage = lazy(() => import("@/pages/items/UploadFoundItemPage").then((m) => ({ default: m.UploadFoundItemPage })));
const FoundItemDetailPage = lazy(() => import("@/pages/items/FoundItemDetailPage").then((m) => ({ default: m.FoundItemDetailPage })));
const LostItemsPage = lazy(() => import("@/pages/items/LostItemsPage").then((m) => ({ default: m.LostItemsPage })));
const ReportLostItemPage = lazy(() => import("@/pages/items/ReportLostItemPage").then((m) => ({ default: m.ReportLostItemPage })));
const LostItemDetailPage = lazy(() => import("@/pages/items/LostItemDetailPage").then((m) => ({ default: m.LostItemDetailPage })));
const SearchPage = lazy(() => import("@/pages/search/SearchPage").then((m) => ({ default: m.SearchPage })));
const ClaimsListPage = lazy(() => import("@/pages/claims/ClaimsListPage").then((m) => ({ default: m.ClaimsListPage })));
const SubmitClaimPage = lazy(() => import("@/pages/claims/SubmitClaimPage").then((m) => ({ default: m.SubmitClaimPage })));
const ClaimDetailPage = lazy(() => import("@/pages/claims/ClaimDetailPage").then((m) => ({ default: m.ClaimDetailPage })));
const NotificationsPage = lazy(() => import("@/pages/notifications/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const ChatPage = lazy(() => import("@/pages/chat/ChatPage").then((m) => ({ default: m.ChatPage })));
const ChatListPage = lazy(() => import("@/pages/chat/ChatListPage").then((m) => ({ default: m.ChatListPage })));
const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const AnalyticsPage = lazy(() => import("@/pages/analytics/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })));
const BulkUploadPage = lazy(() => import("@/pages/items/BulkUploadPage").then((m) => ({ default: m.BulkUploadPage })));
const DisputesPage = lazy(() => import("@/pages/admin/DisputesPage").then((m) => ({ default: m.DisputesPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected — all authenticated users */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Found items — venue staff */}
                <Route path="/items/found" element={<FoundItemsPage />} />
                <Route path="/items/found/new" element={<UploadFoundItemPage />} />
                <Route path="/items/found/:id" element={<FoundItemDetailPage />} />

                {/* Lost items — owners */}
                <Route path="/items/lost" element={<LostItemsPage />} />
                <Route path="/items/lost/new" element={<ReportLostItemPage />} />
                <Route path="/items/lost/:id" element={<LostItemDetailPage />} />

                {/* AI search */}
                <Route path="/search" element={<SearchPage />} />

                {/* Claims */}
                <Route path="/claims" element={<ClaimsListPage />} />
                <Route path="/claims/new" element={<SubmitClaimPage />} />
                <Route path="/claims/:id" element={<ClaimDetailPage />} />

                {/* Notifications */}
                <Route path="/notifications" element={<NotificationsPage />} />

                {/* Chat */}
                <Route path="/chat" element={<ChatListPage />} />
                <Route path="/chat/:claimId" element={<ChatPage />} />

                {/* Profile */}
                <Route path="/profile" element={<ProfilePage />} />

                {/* Analytics (admin) */}
                <Route path="/analytics" element={<AnalyticsPage />} />

                {/* Bulk upload (venue staff) */}
                <Route path="/items/found/bulk" element={<BulkUploadPage />} />

                {/* Disputes (admin) */}
                <Route path="/admin/disputes" element={<DisputesPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
