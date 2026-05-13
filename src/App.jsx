import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ToastManager from "./components/ToastManager";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reviews from "./pages/Reviews";
import Tickets from "./pages/Tickets";
import Import from "./pages/Import";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <ToastManager />
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<ProtectedRoute />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="import" element={<Import />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route index element={<Navigate to="dashboard" />} />
            </Route>
          </Routes>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
