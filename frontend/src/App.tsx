import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './app/Layout';
import { AuthProvider } from './app/providers/AuthProvider';
import { HomePage } from './pages/home/ui/HomePage';
import { LoadingSpinner } from './shared/ui/LoadingSpinner';

// Ленивая загрузка страниц (будут загружаться только при переходе)
const TeamsPage = lazy(() => import('./pages/teams/ui/TeamsPage'));
const TeamPage = lazy(() => import('./pages/teams/ui/TeamPage'));
const MatchesPage = lazy(() => import('./pages/matches/ui/MatchesPage'));
const MatchPage = lazy(() => import('./pages/matches/ui/MatchPage'));
const PredictionNewPage = lazy(() => import('./pages/prediction-new/ui/PredictionNewPage'));
const PredictionResultPage = lazy(() => import('./pages/prediction-result/ui/PredictionResultPage'));
const HistoryPage = lazy(() => import('./pages/history/ui/HistoryPage'));
const AuthPage = lazy(() => import('./pages/auth/ui/AuthPage'));
const AnalyticsPage = lazy(() => import('./pages/analytics/ui/AnalyticsPage'));
const AdminPage = lazy(() => import('./pages/admin/ui/AdminPage'));
const PlayersPage = lazy(() => import('./pages/players/ui/PlayersPage'));
const NotFoundPage = lazy(() => import('./pages/not-found/ui/NotFoundPage'));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingSpinner fullScreen />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/teams/:teamId" element={<TeamPage />} />
              <Route path="/players" element={<PlayersPage />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/matches/:matchId" element={<MatchPage />} />
...
              <Route path="/prediction/:id" element={<PredictionResultPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;