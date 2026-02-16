import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './app/Layout';
import { HomePage } from './pages/home/ui/HomePage';
import { TeamsPage } from './pages/teams/ui/TeamsPage';
import { MatchesPage } from './pages/matches/ui/MatchesPage';
import { AuthPage } from './pages/auth/ui/AuthPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/auth" element={<AuthPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
