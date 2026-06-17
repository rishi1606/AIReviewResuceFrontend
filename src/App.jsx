import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import ProtectedRoute from "./components/ProtectedRoute";


// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reviews from "./pages/Reviews";
import ReviewDetail from "./pages/ReviewDetail";
import Tickets from "./pages/Tickets";
import Import from "./pages/Import";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>

          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<ProtectedRoute />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="reviews/:review_id" element={<ReviewDetail />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="import" element={<Import />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="coming-soon" element={<ComingSoon />} />
              <Route index element={<Navigate to="dashboard" />} />
            </Route>

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
