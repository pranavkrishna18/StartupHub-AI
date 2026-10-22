import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Feed from './pages/Feed';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import StartupDetail from './pages/StartupDetail';
import Dashboard from './pages/Dashboard';
import CreateStartup from './pages/CreateStartup';
import AIReportView from './pages/AIReportView';
import Matches from './pages/Matches';
import Chat from './pages/Chat';
import InvestorDashboard from './pages/InvestorDashboard';
import Discovery from './pages/Discovery';
import AdminDashboard from './pages/AdminDashboard';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import Notifications from './pages/Notifications';
import JobCatalog from './pages/JobCatalog';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import Workspace from './pages/Workspace';
import FundraisingPortal from './pages/FundraisingPortal';
import FundraisingDashboard from './pages/FundraisingDashboard';



function App() {


  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-[#06050c] text-slate-100 font-sans antialiased">
        {/* Navigation Bar */}
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            {/* Public Explorer Feed */}
            <Route path="/" element={<Feed />} />
            <Route path="/jobs" element={<JobCatalog />} />


            {/* Auth Pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Public Startup details */}
            <Route path="/startup/:id" element={<StartupDetail />} />
            <Route
              path="/startup/:id/ai-insights"
              element={
                <ProtectedRoute>
                  <AIReportView />
                </ProtectedRoute>
              }
            />

            {/* Protected Matches & Chat */}
            <Route
              path="/matches"
              element={
                <ProtectedRoute>
                  <Matches />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
             <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resume-analyzer"
              element={
                <ProtectedRoute>
                  <ResumeAnalyzer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace/:startupId"
              element={
                <ProtectedRoute>
                  <Workspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fundraising/:startupId"
              element={
                <ProtectedRoute>
                  <FundraisingPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fundraising-dashboard"
              element={
                <ProtectedRoute allowedRoles={['founder', 'admin']}>
                  <FundraisingDashboard />
                </ProtectedRoute>
              }
            />



            {/* Protected Onboarding Profile */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            {/* Protected Founder/Admin Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['founder', 'admin']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Protected Startup Submission Form */}
            <Route
              path="/submit-startup"
              element={
                <ProtectedRoute allowedRoles={['founder', 'admin']}>
                  <CreateStartup />
                </ProtectedRoute>
              }
            />

            {/* Protected Investor Dashboard */}
            <Route
              path="/investor-dashboard"
              element={
                <ProtectedRoute allowedRoles={['investor', 'admin']}>
                  <InvestorDashboard />
                </ProtectedRoute>
              }
            />

            {/* Protected Startup Discovery */}
            <Route
              path="/discovery"
              element={
                <ProtectedRoute>
                  <Discovery />
                </ProtectedRoute>
              }
            />

            {/* Protected Admin Control Center */}
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;
