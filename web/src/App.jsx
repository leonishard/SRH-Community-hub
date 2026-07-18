import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { MyCircle } from './pages/MyCircle';
import { Discover } from './pages/Discover';
import { Groups } from './pages/Groups';
import { GroupDetail } from './pages/GroupDetail';
import { Events } from './pages/Events';
import { Friends } from './pages/Friends';
import { Review } from './pages/Review';
import { StudentProfile } from './pages/StudentProfile';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Login lives inside AppLayout too, so the sidebar (and guest nav) is
                always present — never a bare dead-end form. */}
            <Route element={<AppLayout />}>
              <Route path="/login" element={<Login />} />
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
              <Route path="/groups/:documentId" element={<GroupDetail />} />
              <Route path="/events" element={<Events />} />
              <Route
                path="/friends"
                element={
                  <ProtectedRoute>
                    <Friends />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/students/:documentId"
                element={
                  <ProtectedRoute>
                    <StudentProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/review"
                element={
                  <ProtectedRoute>
                    <Review />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/discover" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
