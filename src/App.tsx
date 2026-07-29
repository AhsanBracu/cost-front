import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { GuestRoute, ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { CostsListPage } from "./pages/CostsListPage";
import { CostFormPage } from "./pages/CostFormPage";
import { ProfilePage } from "./pages/ProfilePage";

function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/costs" element={<CostsListPage />} />
          <Route path="/costs/new" element={<CostFormPage />} />
          <Route path="/costs/:id" element={<CostFormPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/costs" replace />} />
      <Route path="*" element={<Navigate to="/costs" replace />} />
    </Routes>
  );
}

export default App;
