import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import SiteLayout from './components/SiteLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import { ForbiddenPage, NotFoundPage } from './pages/StatusPages';

export default function App() {
  return (
    <Routes>
      {/* Connexion et inscription : écran partagé, sans navbar ni footer */}
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/inscription" element={<RegisterPage />} />
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/espace"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/acces-refuse" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
