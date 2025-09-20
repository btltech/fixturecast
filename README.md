<div align="center">
<img width="1200" height="475" alt="FixtureCast Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ⚽ FixtureCast - AI-Powered Football Predictions

An intelligent football prediction platform that provides detailed match analysis, confidence metrics, and comprehensive statistics for major football leagues worldwide.

## 🚀 Live Demo
- **Cloudflare Pages**: ✅ **LIVE & DEPLOYED** - Auto-deploys from GitHub
- **GitHub**: [https://github.com/btltech/fixturecast](https://github.com/btltech/fixturecast)

## ✨ Features

- 🤖 **AI-Powered Predictions** using Google's Gemini model
- 📊 **Comprehensive Analytics** with confidence metrics
- 🏆 **13+ Major Leagues** including Premier League, La Liga, Serie A
- 📱 **Mobile-First Design** with responsive UI
- ⚡ **Real-time Updates** with live match tracking
- 🎯 **Accuracy Tracking** with detailed performance metrics
- 🔄 **Multi-platform Deployment** (Cloudflare, Vercel, Netlify)

## 🏗️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **AI/ML**: Google Gemini API
- **Data**: API-Sports.io (Football API)
- **Deployment**: Cloudflare Pages / Vercel
- **Serverless**: Cloudflare Workers / Vercel Functions

## 🛠️ Local Development

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Football API key from [API-Sports.io](https://api-sports.io)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/btltech/fixturecast.git
   cd fixturecast
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create `.env.local` file:
   ```env
   VITE_FOOTBALL_API_KEY=your_api_key_here
   GEMINI_API_KEY=your_gemini_key_here
   ```

4. **Start development servers**
   ```bash
   # Start both frontend and API proxy
   npm run start
   
   # Or separately:
   npm run dev      # Frontend only
   npm run proxy    # API proxy only
   ```

5. **Open in browser**
   - Frontend: `http://localhost:5173`
   - API Proxy: `http://localhost:3001`

## 🌐 Deployment Options

### ✅ Cloudflare Pages (DEPLOYED & LIVE)

**Current Setup:**
- ⚡ **Auto-deployed** from GitHub main branch
- 🔒 **Production-ready** with DDoS protection and WAF
- 🌍 **Global CDN** with 200+ edge locations
- 📊 **Monitoring** via Cloudflare analytics dashboard

**Live Features:**
- 🚀 **Automatic deployments** on every git push
- 🔄 **Serverless API proxy** via Cloudflare Pages Functions
- 📱 **Mobile-optimized** with PWA capabilities
- 🔒 **HTTPS by default** with automatic SSL certificates

### Option 2: Vercel

**Deploy to Vercel:**
1. See detailed guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Import repository to Vercel
3. Set environment variable: `FOOTBALL_API_KEY`
4. Deploy automatically

### Option 3: Netlify

**Deploy to Netlify:**
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Set environment variables

## 🏗️ Architecture

### Development
```
Frontend (Vite) ←→ CORS Proxy (Express) ←→ Football API
     ↓
  Gemini AI API
```

### Production (Cloudflare)
```
CDN (Global) ←→ Pages Functions ←→ Football API
     ↓
  Gemini AI API
```

## 📊 Supported Leagues

- 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League
- 🇪🇸 La Liga
- 🇮🇹 Serie A
- 🇩🇪 Bundesliga
- 🇫🇷 Ligue 1
- 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Championship, League One, League Two
- 🇧🇷 Brasileirão Série A
- 🇦🇷 Argentine Liga Profesional
- 🇳🇱 Eredivisie
- 🇵🇹 Primeira Liga
- 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish Premiership
- 🇹🇷 Süper Lig
- 🇲🇽 Liga MX

## 🎯 Prediction Features

- **Match Outcomes** with probability percentages
- **Exact Scoreline** predictions
- **Both Teams to Score (BTTS)** analysis
- **Over/Under Goals** with confidence levels
- **Half-time/Full-time** predictions
- **Clean Sheet** probabilities
- **Corner Kicks** predictions
- **Form Analysis** and head-to-head stats

## 📈 Performance

- **First Contentful Paint**: <1.5s
- **Largest Contentful Paint**: <2.5s
- **Time to Interactive**: <3s
- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices, SEO)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [API-Sports.io](https://api-sports.io) for comprehensive football data
- [Google Gemini](https://gemini.google.com) for AI-powered predictions
- [Cloudflare](https://cloudflare.com) for global infrastructure
- [Vite](https://vitejs.dev) for lightning-fast development

---

<div align="center">
<p>Made with ⚽ and ❤️ by the FixtureCast Team</p>
<p>
  <a href="https://twitter.com/fixturecast">Twitter</a> •
  <a href="https://github.com/btltech/fixturecast">GitHub</a> •
  <a href="mailto:contact@fixturecast.com">Email</a>
</p>
</div>
# Force deployment trigger
# ARIA fixes deployed
# Trigger deployment Sat Sep 20 13:30:07 BST 2025
