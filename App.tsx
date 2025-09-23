import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { View } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import MobileBottomNavigation from './components/MobileBottomNavigation';
import { useAppContext } from './contexts/AppContext';

// Lazy load components for code splitting
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Fixtures = React.lazy(() => import('./components/Fixtures'));
const LeaguePage = React.lazy(() => import('./components/LeaguePage'));
const MatchDetail = React.lazy(() => import('./components/MatchDetail'));
const TeamPage = React.lazy(() => import('./components/TeamPage'));
const MyTeams = React.lazy(() => import('./components/MyTeams'));
const News = React.lazy(() => import('./components/News'));
const PredictionDetail = React.lazy(() => import('./components/PredictionDetail'));
const TodaysPredictions = React.lazy(() => import('./components/TodaysPredictions'));

// Wrapper component to handle navigation and provide router context
const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading } = useAppContext();
  const [selectedLeagueFilter, setSelectedLeagueFilter] = React.useState<'all' | any>('all');

  // Helper functions for navigation
  const selectMatch = (match: any) => {
    navigate(`/match/${match.id}`, { state: { match } });
  };

  const navigateToFixtures = () => {
    navigate('/fixtures');
  };

  const selectTeam = (teamName: string) => {
    navigate(`/team/${encodeURIComponent(teamName)}`);
  };

  const selectPrediction = (prediction: any) => {
    navigate('/prediction', { state: { prediction } });
  };

  const navigateTo = (view: View) => {
    switch (view) {
      case View.Dashboard:
        navigate('/');
        break;
      case View.Fixtures:
        navigate('/fixtures');
        break;
      case View.MyTeams:
        navigate('/my-teams');
        break;
      case View.News:
        navigate('/news');
        break;
      default:
        navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center justify-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Dashboard - Root route */}
      <Route
        path="/"
        element={
          <Dashboard
            onSelectMatch={selectMatch}
            onSelectTeam={selectTeam}
            navigateToFixtures={navigateToFixtures}
            setSelectedLeagueFilter={setSelectedLeagueFilter}
            onSelectPrediction={selectPrediction}
          />
        }
      />

      {/* Fixtures */}
      <Route
        path="/fixtures"
        element={
          <Fixtures
            onSelectMatch={selectMatch}
            onSelectTeam={selectTeam}
            onSelectPrediction={selectPrediction}
            selectedLeagueFilter={selectedLeagueFilter}
          />
        }
      />

      {/* League Page - Dynamic route */}
      <Route
        path="/league/:league"
        element={
          <LeaguePage
            onSelectMatch={selectMatch}
            onSelectTeam={selectTeam}
            onSelectPrediction={selectPrediction}
          />
        }
      />

      {/* Match Detail - Dynamic route */}
      <Route
        path="/match/:matchId"
        element={<MatchDetail onSelectTeam={selectTeam} />}
      />

      {/* Team Page - Dynamic route */}
      <Route
        path="/team/:teamName"
        element={<TeamPage onNavigate={navigateTo} />}
      />

      {/* My Teams */}
      <Route
        path="/my-teams"
        element={<MyTeams onSelectTeam={selectTeam} />}
      />

      {/* News */}
      <Route
        path="/news"
        element={<News />}
      />

      {/* Prediction Detail */}
      <Route
        path="/prediction"
        element={<PredictionDetail />}
      />
      <Route
        path="/prediction/:matchId"
        element={<PredictionDetail />}
      />
      <Route
        path="/predictions"
        element={<TodaysPredictions />}
      />

      {/* Catch-all route - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Navigation component with active state detection
const Navigation: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="bg-gray-800 py-6 hidden md:block">
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center gap-6 flex-wrap">
          <Link
            to="/"
            className={`px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 ${
              isActive('/')
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white hover:shadow-md'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/fixtures"
            className={`px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 ${
              isActive('/fixtures')
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white hover:shadow-md'
            }`}
          >
            Fixtures
          </Link>
          <Link
            to="/my-teams"
            className={`px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 ${
              isActive('/my-teams')
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white hover:shadow-md'
            }`}
          >
            My Teams
          </Link>
          <Link
            to="/news"
            className={`px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 ${
              isActive('/news')
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white hover:shadow-md'
            }`}
          >
            News
          </Link>
          <Link
            to="/predictions"
            className={`px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 ${
              isActive('/predictions')
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white hover:shadow-md'
            }`}
          >
            Today&apos;s Predictions
          </Link>
        </div>
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
      <Navigation />
      <main className="flex-grow container mx-auto px-4 py-8 pb-20 md:pb-8">
        <Suspense fallback={<div className="flex justify-center items-center h-64"><LoadingSpinner /></div>}>
          <AppContent />
        </Suspense>
      </main>
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <MobileBottomNavigation />
      </div>
    </div>
  );
};

export default App;
