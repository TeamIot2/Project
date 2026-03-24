// Root application component with routing setup

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StyleProvider } from "./contexts/StyleContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/I18nContext";
import { AuthProvider, ProtectedRoute } from "./contexts/AuthContext";
import { EnvironmentProvider } from "./contexts/EnvironmentContext";
import { DashboardProvider } from "./contexts/DashboardContext";
import { DualViewPreferenceProvider } from "./contexts/DualViewPreferenceContext";
import Layout from "./components/Layout";
import DualViewShell from "./components/DualViewShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Devices from "./pages/Devices";
import Settings from "./pages/Settings";

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="history" element={<History />} />
          <Route path="devices" element={<Devices />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <StyleProvider>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <EnvironmentProvider>
              <DashboardProvider>
                <DualViewPreferenceProvider>
                  <BrowserRouter>
                    <DualViewShell Content={AppContent} />
                  </BrowserRouter>
                </DualViewPreferenceProvider>
              </DashboardProvider>
            </EnvironmentProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </StyleProvider>
  );
}
