
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 border-t border-gray-700 mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-400 text-sm">
          <h3 className="font-bold text-gray-200 mb-2">Disclaimer</h3>
          <p className="max-w-3xl mx-auto">
            FixtureCast provides predictions based on statistical models and historical data. These predictions are not guarantees. Football is inherently unpredictable. We do not provide betting services and do not encourage or endorse gambling. Use this app for entertainment and informational purposes only.
          </p>

          <div className="mt-5 flex flex-col items-center space-y-2">
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white text-xs font-bold">18+</span>
              <span className="text-gray-300">For people aged 18 or over only. Please gamble responsibly.</span>
            </div>
            <p className="text-gray-400 text-xs">
              Need help? Visit{' '}
              <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">BeGambleAware.org</a>{' '}or{' '}
              <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">GamCare</a>.
            </p>
          </div>
          <p className="mt-6 text-gray-500">
            &copy; {new Date().getFullYear()} FixtureCast. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
