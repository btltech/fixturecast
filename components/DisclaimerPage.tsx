import React from 'react';

const DisclaimerPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">Important Disclaimer</h1>
            <p className="text-gray-300 text-lg">
              Please read this disclaimer carefully before using FixtureCast
            </p>
          </div>

          {/* Main Disclaimer */}
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-6 mb-8">
            <div className="flex items-start space-x-3">
              <div className="text-amber-400 text-2xl">⚠️</div>
              <div>
                <h2 className="text-xl font-semibold text-amber-300 mb-3">
                  Prediction Accuracy and Limitations
                </h2>
                <p className="text-amber-100 text-lg leading-relaxed mb-4">
                  <strong>FixtureCast provides predictions based on statistical models and historical data. 
                  These predictions are not guarantees.</strong>
                </p>
                <p className="text-amber-100 leading-relaxed">
                  Football is inherently unpredictable. We do not encourage or endorse gambling. 
                  Use this app for entertainment and informational purposes only. 
                  <strong> Always gamble responsibly if you choose to do so.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Sections */}
          <div className="space-y-8">
            {/* About Our Predictions */}
            <section className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">📊 About Our Predictions</h3>
              <ul className="text-gray-300 space-y-3">
                <li>• Predictions are generated using statistical models and historical match data</li>
                <li>• Results are based on team performance, form, head-to-head records, and other factors</li>
                <li>• Past performance does not guarantee future results</li>
                <li>• Unexpected events (injuries, weather, referee decisions) can affect outcomes</li>
              </ul>
            </section>

            {/* Entertainment Purpose */}
            <section className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">🎮 Entertainment Purpose</h3>
              <ul className="text-gray-300 space-y-3">
                <li>• FixtureCast is designed for entertainment and informational purposes only</li>
                <li>• Predictions should not be used as the sole basis for betting decisions</li>
                <li>• We encourage responsible enjoyment of football predictions</li>
                <li>• Use our insights to enhance your understanding and enjoyment of the game</li>
              </ul>
            </section>

            {/* Gambling Responsibility */}
            <section className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-red-300 mb-4">🚫 Gambling Responsibility</h3>
              <div className="text-red-100 space-y-3">
                <p>• <strong>We do not encourage or endorse gambling</strong></p>
                <p>• If you choose to gamble, always do so responsibly</p>
                <p>• Never bet more than you can afford to lose</p>
                <p>• Gambling can be addictive - seek help if you need it</p>
                <p>• Consider gambling as entertainment, not as a way to make money</p>
                <p>• <strong>You must be 18+ to gamble (check your local laws)</strong></p>
              </div>
              
              <div className="mt-6 p-4 bg-red-800/30 rounded border border-red-500/50">
                <h4 className="font-semibold text-red-200 mb-2">International Gambling Help Resources:</h4>
                <div className="text-red-100 text-sm space-y-3">
                  <div>
                    <p className="font-medium mb-1">🇬🇧 United Kingdom:</p>
                    <ul className="space-y-1 ml-4">
                      <li>• <strong>GamCare</strong>: <a href="https://www.gamcare.org.uk" className="underline hover:no-underline">gamcare.org.uk</a> | 0808 8020 133</li>
                      <li>• <strong>BeGambleAware</strong>: <a href="https://www.begambleaware.org" className="underline hover:no-underline">begambleaware.org</a></li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">🇺🇸 United States:</p>
                    <ul className="space-y-1 ml-4">
                      <li>• <strong>National Problem Gambling Helpline</strong>: 1-800-522-4700</li>
                      <li>• <strong>Gamblers Anonymous</strong>: <a href="https://www.gamblersanonymous.org" className="underline hover:no-underline">gamblersanonymous.org</a></li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">🌍 Other Countries:</p>
                    <p className="ml-4">Search for "gambling help" + your country name for local resources</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Data Sources */}
            <section className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">📈 Data Sources and Accuracy</h3>
              <ul className="text-gray-300 space-y-3">
                <li>• We strive to provide accurate and up-to-date information</li>
                <li>• Data is sourced from reliable football statistics providers</li>
                <li>• We cannot guarantee 100% accuracy of all data</li>
                <li>• Match results and statistics are updated regularly but may have delays</li>
              </ul>
            </section>

            {/* Liability Disclaimer */}
            <section className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">⚖️ Liability Disclaimer</h3>
              <p className="text-gray-300 leading-relaxed mb-3">
                FixtureCast and its creators are not responsible for any losses, damages, or consequences 
                that may result from the use of our predictions or information. Users assume full 
                responsibility for their actions and decisions based on the content provided by this application.
              </p>
              <p className="text-gray-300 leading-relaxed">
                Nothing in this disclaimer affects your statutory consumer rights under applicable local laws. 
                Please consult local regulations regarding prediction services and gambling in your jurisdiction.
              </p>
            </section>

            {/* Age Restriction */}
            <section className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">🔞 Age Restriction</h3>
              <p className="text-gray-300 leading-relaxed mb-3">
                <strong>You must be 18 years or older (or the legal gambling age in your jurisdiction) to use this application for any gambling-related purposes.</strong> 
                Please check your local laws for the minimum gambling age in your country.
              </p>
              <p className="text-gray-300 leading-relaxed">
                If you are under the legal gambling age, you may use this app for entertainment and informational purposes only 
                under parental supervision, but you must not engage in any gambling-related activities.
              </p>
            </section>
          </div>

          {/* Regulatory Notice */}
          <div className="mt-8 bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-300 mb-3">� International Regulatory Information</h3>
            <div className="text-blue-100 space-y-2 text-sm">
              <p>• We comply with applicable data protection laws (GDPR, etc.)</p>
              <p>• Gambling laws vary by country and jurisdiction</p>
              <p>• Always ensure any betting operators you use are properly licensed in your region</p>
              <p>• Check your local gambling regulations before engaging in any betting activities</p>
              <p>• Some countries restrict or prohibit online gambling - please respect your local laws</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-gray-400 text-sm">
              By using FixtureCast, you acknowledge that you have read, understood, 
              and agree to this disclaimer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerPage;