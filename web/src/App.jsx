import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { MyCircle } from './pages/MyCircle';
import { Discover } from './pages/Discover';
import { Groups } from './pages/Groups';
import { Events } from './pages/Events';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route
                path="/my-circle"
                element={
                  <ProtectedRoute>
                    <MyCircle />
                  </ProtectedRoute>
                }
              />
              {/* Public per the backend's Public role: read-only Groups/Events/Posts, no login required. */}
              <Route path="/discover" element={<Discover />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/events" element={<Events />} />
            </Route>
            <Route path="*" element={<Navigate to="/discover" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
