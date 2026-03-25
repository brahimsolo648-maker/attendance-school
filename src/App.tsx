import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Teacher Pages
import TeacherAuth from "./pages/teacher/TeacherAuth";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherSettings from "./pages/teacher/TeacherSettings";
import TeacherClassPage from "./pages/teacher/TeacherClassPage";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminMain from "./pages/admin/AdminMain";
import ControlPanelLogin from "./pages/admin/ControlPanelLogin";
import ControlPanelDashboard from "./pages/admin/ControlPanelDashboard";
import ControlPanelSettings from "./pages/admin/ControlPanelSettings";
import ManageLists from "./pages/admin/ManageLists";
import StudentDetails from "./pages/admin/StudentDetails";
import StudentCardPage from "./pages/admin/StudentCardPage";
import SectionCardsPage from "./pages/admin/SectionCardsPage";
import AccountRequests from "./pages/admin/AccountRequests";
import Reports from "./pages/admin/Reports";
import QRScanner from "./pages/admin/QRScanner";
import DailyAttendance from "./pages/admin/DailyAttendance";
import Statistics from "./pages/admin/Statistics";
import Archive from "./pages/admin/Archive";
import UploadLists from "./pages/admin/UploadLists";
import NotificationsPage from "./pages/admin/NotificationsPage";
import AbsencesAndTardiness from "./pages/admin/AbsencesAndTardiness";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Main */}
            <Route path="/" element={<Index />} />

            {/* Teacher Routes - Public Auth */}
            <Route path="/teacher/auth" element={<TeacherAuth />} />
            
            {/* Teacher Routes - Protected */}
            <Route path="/teacher/dashboard" element={
              <ProtectedRoute requiredRole="teacher" redirectTo="/teacher/auth">
                <TeacherDashboard />
              </ProtectedRoute>
            } />
            <Route path="/teacher/settings" element={
              <ProtectedRoute requiredRole="teacher" redirectTo="/teacher/auth">
                <TeacherSettings />
              </ProtectedRoute>
            } />

            {/* Admin Routes - Public Login */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Admin Routes - Protected */}
            <Route path="/admin/main" element={
              <ProtectedRoute requiredRole="admin">
                <AdminMain />
              </ProtectedRoute>
            } />
            <Route path="/admin/control-panel" element={
              <ProtectedRoute requiredRole="admin">
                <ControlPanelLogin />
              </ProtectedRoute>
            } />
            <Route path="/admin/control-panel/dashboard" element={
              <ProtectedRoute requiredRole="admin">
                <ControlPanelDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/control-panel/settings" element={
              <ProtectedRoute requiredRole="admin">
                <ControlPanelSettings />
              </ProtectedRoute>
            } />

            {/* Functional Pages - Admin Protected */}
            <Route path="/admin/manage-lists" element={
              <ProtectedRoute requiredRole="admin">
                <ManageLists />
              </ProtectedRoute>
            } />
            <Route path="/admin/student/:id" element={
              <ProtectedRoute requiredRole="admin">
                <StudentDetails />
              </ProtectedRoute>
            } />
            <Route path="/admin/student/:id/card" element={
              <ProtectedRoute requiredRole="admin">
                <StudentCardPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/section/:sectionId/cards" element={
              <ProtectedRoute requiredRole="admin">
                <SectionCardsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/account-requests" element={
              <ProtectedRoute requiredRole="admin">
                <AccountRequests />
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute requiredRole="admin">
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/admin/qr-scanner" element={
              <ProtectedRoute requiredRole="admin">
                <QRScanner />
              </ProtectedRoute>
            } />
            <Route path="/admin/daily-attendance" element={
              <ProtectedRoute requiredRole="admin">
                <DailyAttendance />
              </ProtectedRoute>
            } />
            <Route path="/admin/statistics" element={
              <ProtectedRoute requiredRole="admin">
                <Statistics />
              </ProtectedRoute>
            } />
            <Route path="/admin/archive" element={
              <ProtectedRoute requiredRole="admin">
                <Archive />
              </ProtectedRoute>
            } />
            <Route path="/admin/upload-lists" element={
              <ProtectedRoute requiredRole="admin">
                <UploadLists />
              </ProtectedRoute>
            } />
            <Route path="/admin/notifications" element={
              <ProtectedRoute requiredRole="admin">
                <NotificationsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/absences" element={
              <ProtectedRoute requiredRole="admin">
                <AbsencesAndTardiness />
              </ProtectedRoute>
            } />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
