import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/hero.css';

const HeroLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  // Function to reliably navigate to dashboard
  const navigateToDashboard = () => {
    console.log('Attempting to navigate to dashboard...');
    
    // Set visited flag first
    localStorage.setItem('fixturecast_visited', 'true');
    console.log('Visited flag set in localStorage');
    
    // Use the most reliable method - direct window location
    console.log('Using window.location.href for navigation');
    window.location.href = '/dashboard';
  };

  // Check if user has visited before
  useEffect(() => {
    const hasVisited = localStorage.getItem('fixturecast_visited');
    if (hasVisited) {
      console.log('User has visited before, redirecting to dashboard');
      window.location.href = '/dashboard';
    }
  }, []);



  if (!isVisible) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white overflow-hidden">


      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-500 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-green-500 rounded-full animate-bounce"></div>
        <div className="absolute bottom-20 left-20 w-12 h-12 bg-yellow-500 rounded-full animate-pulse"></div>
        <div className="absolute bottom-40 right-10 w-14 h-14 bg-red-500 rounded-full animate-bounce"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        
        {/* Logo/Brand */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="mb-4">
            <span className="text-6xl">⚽</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-green-400 to-blue-400 bg-clip-text text-transparent">
            FixtureCast
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 font-light">
            AI-Powered Football Predictions You Can Trust
          </p>
        </div>

        {/* Key Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12 animate-slideInUp">
          
          {/* Feature 1 */}
          <div className="hero-feature-card text-center p-6 bg-gray-800/50 rounded-lg backdrop-blur-sm border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300">
            <div className="text-3xl mb-3">🧠</div>
            <h3 className="text-lg font-semibold mb-2 text-blue-300">Smart Predictions</h3>
            <p className="text-gray-400 text-sm">
              Advanced AI algorithms analyze team performance, form, and historical data
            </p>
          </div>

          {/* Feature 2 */}
          <div className="hero-feature-card text-center p-6 bg-gray-800/50 rounded-lg backdrop-blur-sm border border-gray-700/50 hover:border-green-500/50 transition-all duration-300">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2 text-green-300">Performance Tracking</h3>
            <p className="text-gray-400 text-sm">
              Track prediction accuracy and performance metrics across all matches
            </p>
          </div>

          {/* Feature 3 */}
          <div className="hero-feature-card text-center p-6 bg-gray-800/50 rounded-lg backdrop-blur-sm border border-gray-700/50 hover:border-yellow-500/50 transition-all duration-300">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold mb-2 text-yellow-300">Accurate Results</h3>
            <p className="text-gray-400 text-sm">
              Transparent accuracy metrics so you know exactly how we perform
            </p>
          </div>
        </div>

        {/* Value Proposition */}
        <div className="flex flex-wrap justify-center gap-8 mb-12 animate-fadeIn animation-delay-300">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">⚽</div>
            <div className="text-gray-400 text-sm">Premier League</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">🤖</div>
            <div className="text-gray-400 text-sm">AI Powered</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400">📈</div>
            <div className="text-gray-400 text-sm">Data Driven</div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center animate-bounceIn animation-delay-500">
          <button 
            onClick={navigateToDashboard}
            className="hero-cta-button bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-semibold py-4 px-8 rounded-full text-lg transition-all transform hover:scale-105 shadow-lg cursor-pointer border-none"
          >
            Start Exploring Predictions
          </button>
          <p className="text-gray-400 text-sm mt-4">
            Free to use • Entertainment only • No registration required
          </p>
        </div>

        {/* Disclaimer Preview */}
        <div className="mt-12 text-center text-xs text-gray-500 max-w-2xl">
          <p>
            ⚠️ For entertainment purposes only. Predictions are not guarantees. 
            Always gamble responsibly. 18+ only.
          </p>
        </div>
      </div>


    </div>
  );
};

export default HeroLandingPage;