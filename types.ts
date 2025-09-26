export enum League {
  // UEFA Competitions
  ChampionsLeague = "UEFA Champions League",
  EuropaLeague = "UEFA Europa League",
  EuropaConferenceLeague = "UEFA Europa Conference League",

  // Domestic Leagues
  PremierLeague = "Premier League",
  LaLiga = "La Liga",
  SerieA = "Serie A",
  Bundesliga = "Bundesliga",
  Ligue1 = "Ligue 1",
  Championship = "EFL Championship",
  LeagueOne = "EFL League One",
  LeagueTwo = "EFL League Two",
  BrasileiraoSerieA = "Brasileirão Série A",
  ArgentineLigaProfesional = "Argentine Liga Profesional",
  Eredivisie = "Eredivisie",
  PrimeiraLiga = "Primeira Liga",
  ScottishPremiership = "Scottish Premiership",
  SuperLig = "Süper Lig",
  LigaMX = "Liga MX",
  MLS = "Major League Soccer",
  // Second Divisions
  Bundesliga2 = "2. Bundesliga",
  Ligue2 = "Ligue 2",
  SerieB = "Serie B",
  SegundaDivision = "Segunda División",
  LigaPortugal2 = "Liga Portugal 2",
  // Additional First Divisions
  BelgianProLeague = "Belgian Pro League",
  ALeague = "A-League",
  GreekSuperLeague1 = "Super League 1",
  ColombiaPrimeraA = "Primera A",
  ChilePrimeraDivision = "Primera División",
  FAWSL = "FA WSL",
  NWSL = "NWSL",
  AFCChampionsLeague = "AFC Champions League",
  CopaLibertadores = "Copa Libertadores",
  ConferenceLeague = "UEFA Europa Conference League", // Alias for EuropaConferenceLeague
}

export interface Team {
  id?: number;
  logo: string;
  shortName: string;
  fullName?: string;
  jerseyColors: {
    primary: string;
    secondary: string;
  };
  country?: string;
  league?: League | string;
  founded?: number;
  venue?: string;
  description?: string;

  // Enhanced team information
  website?: string;
  address?: string;
  city?: string;
  capacity?: number;

  // Squad information
  squad?: Player[];
  coach?: Coach;

  // Statistics
  seasonStats?: TeamSeasonStats;
  leaguePosition?: number;
  points?: number;
  goalDifference?: number;

  // Recent form
  recentForm?: string[];
  last5Matches?: MatchResult[];

  // Trophy history
  trophies?: Trophy[];
  honors?: string[];

  // Transfer information
  transfers?: Transfer[];

  // Injuries and suspensions
  injuries?: Injury[];
  suspensions?: Suspension[];
}

export interface Player {
  id: number;
  name: string;
  position: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker';
  age: number;
  nationality: string;
  photo?: string;
  number?: number;
  injured?: boolean;
  rating?: number;
}

export interface Coach {
  id: number;
  name: string;
  nationality: string;
  photo?: string;
  age?: number;
}

export interface TeamSeasonStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  failedToScore: number;
  biggestWin?: string;
  biggestLoss?: string;
  currentStreak?: string;
}

export interface MatchResult {
  date: string;
  opponent: string;
  result: 'W' | 'D' | 'L';
  score: string;
  competition: string;
  home: boolean;
}

export interface Trophy {
  competition: string;
  season: string;
  count: number;
}

export interface Transfer {
  id: number;
  player: string;
  type: 'in' | 'out';
  date: string;
  from?: string;
  to?: string;
  fee?: string;
}

export interface Injury {
  player: string;
  type: string;
  expectedReturn?: string;
  missedGames?: number;
}

export interface Suspension {
  player: string;
  reason: string;
  matchesRemaining: number;
  expectedReturn?: string;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  league: League;
  date: string; // ISO 8601 format
  venue?: string;
  status?: 'NS' | 'LIVE' | 'HT' | 'FT' | 'CANC' | 'POSTP' | 'SUSP' | 'TBD' | 'postponed' | 'cancelled' | 'suspended' | 'abandoned' | 'finished' | 'completed';
  homeScore?: number;
  awayScore?: number;
}

export interface LiveMatch extends Match {
  status: 'NS' | 'LIVE' | 'HT' | 'FT' | 'CANC' | 'POSTP' | 'SUSP' | 'TBD' | 'postponed' | 'cancelled' | 'suspended' | 'abandoned' | 'finished' | 'completed';
  homeScore: number;
  awayScore: number;
  homeScoreHT?: number;
  awayScoreHT?: number;
  minute?: number;
  period?: '1H' | '2H' | 'ET' | 'PEN';
  venue?: string;
  referee?: string;
  events?: MatchEvent[];
  lastUpdated: string;
}

export interface MatchEvent {
  id: string;
  type: 'goal' | 'card' | 'substitution' | 'var';
  minute: number;
  period: '1H' | '2H' | 'ET' | 'PEN';
  team: 'home' | 'away';
  player: string;
  description: string;
  timestamp: string;
  detail?: string;
}

export interface LiveMatchUpdate {
  matchId: string;
  status: 'NS' | 'LIVE' | 'HT' | 'FT' | 'CANC' | 'POSTP' | 'SUSP' | 'TBD' | 'postponed' | 'cancelled' | 'suspended' | 'abandoned' | 'finished' | 'completed';
  homeScore: number;
  awayScore: number;
  minute?: number;
  period?: LiveMatch['period'];
  events: MatchEvent[];
  lastUpdated: string;
}

export interface TeamForm {
  teamId: number;
  teamName: string;
  last10Results: ('W' | 'D' | 'L')[];
  homeForm: ('W' | 'D' | 'L')[];
  awayForm: ('W' | 'D' | 'L')[];
  formTrend: 'improving' | 'declining' | 'stable';
  pointsLast10: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  lastUpdated: string;
}

export interface FormAnalysis {
  overall: TeamForm;
  home: TeamForm;
  away: TeamForm;
  trend: {
    direction: 'up' | 'down' | 'stable';
    strength: number; // 0-100
    description: string;
  };
}

export enum ConfidenceLevel {
  Low = "Low",
  Medium = "Medium",
  High = "High",
}

export interface KeyFactor {
    category: string;
    points: string[];
}

export interface GoalLinePrediction {
  line: number;
  overProbability: number;
  underProbability: number;
}

export interface BTTSPrediction {
  yesProbability: number; // 0-100
  noProbability: number;  // 0-100 (should equal 100 - yesProbability)
}

export interface HTFTPrediction {
  homeHome: number;    // Home team leads at HT, wins at FT
  homeDraw: number;    // Home team leads at HT, draws at FT
  homeAway: number;    // Home team leads at HT, loses at FT
  drawHome: number;    // Draw at HT, home team wins at FT
  drawDraw: number;    // Draw at HT, draw at FT
  drawAway: number;    // Draw at HT, away team wins at FT
  awayHome: number;    // Away team leads at HT, home team wins at FT
  awayDraw: number;    // Away team leads at HT, draws at FT
  awayAway: number;    // Away team leads at HT, wins at FT
}

export interface ScoreRangePrediction {
  zeroToOne: number;   // 0-1 goals total
  twoToThree: number;  // 2-3 goals total
  fourPlus: number;    // 4+ goals total
}

export interface FirstGoalscorerPrediction {
  homeTeam: number;    // Home team scores first
  awayTeam: number;    // Away team scores first
  noGoalscorer: number; // No goals scored
}

export interface CleanSheetPrediction {
  homeTeam: number;    // Home team keeps clean sheet
  awayTeam: number;    // Away team keeps clean sheet
}

export interface CornerPrediction {
  over: number;        // Over 9.5 corners
  under: number;       // Under 9.5 corners
}

export interface ExpectedGoalsPrediction {
  homeXg: number;      // Expected goals for home team
  awayXg: number;      // Expected goals for away team
}

export interface ModelWeightsPrediction {
  xgboost: number;     // XGBoost model weight (0-100)
  poisson: number;     // Poisson regression weight (0-100)
  neuralNet: number;   // Neural network weight (0-100)
  bayesian: number;    // Bayesian model weight (0-100)
}

export interface UncertaintyMetrics {
  predictionVariance: number;    // Statistical variance (0-100)
  dataQuality: 'High' | 'Medium' | 'Low';  // Quality of available data
  modelAgreement: number;        // Model consensus percentage (0-100)
}

export interface Prediction {
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  predictedScoreline: string;
  confidence: ConfidenceLevel;
  // Some generated predictions may omit keyFactors; make optional to avoid runtime crashes
  keyFactors?: KeyFactor[];
  goalLine: GoalLinePrediction;
  btts?: BTTSPrediction;
  htft?: HTFTPrediction;
  scoreRange?: ScoreRangePrediction;
  firstGoalscorer?: FirstGoalscorerPrediction;
  cleanSheet?: CleanSheetPrediction;
  corners?: CornerPrediction;
  expectedGoals?: ExpectedGoalsPrediction;
  modelWeights?: ModelWeightsPrediction;
  uncertaintyMetrics?: UncertaintyMetrics;
  confidencePercentage?: number; // 0-100 based on historical accuracy
  confidenceReason?: string; // Explanation of confidence level
  prediction?: Prediction; // Self-reference for nested prediction data
}

export enum View {
    Dashboard = 'dashboard',
    Fixtures = 'fixtures',
    Predictions = 'predictions',
    MatchDetail = 'matchDetail',
    MyTeams = 'myTeams',
    News = 'news',
    TeamPage = 'teamPage',
    PredictionDetail = 'predictionDetail',
    Accuracy = 'accuracy',
    // Scheduler removed from public site - admin access via AWS Console only
}

export enum AlertType {
    PredictionReady = 'PredictionReady',
    InjuryNews = 'InjuryNews',
}

export interface Alert {
    id: string;
    type: AlertType;
    message: string;
    teamName: string;
    timestamp: string;
    read: boolean;
}

export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  snippet: string;
  source: 'BBC Sport' | 'Sky Sports' | 'ESPN' | 'NBC Sports' | 'BeIN Sports' | 'Goal.com' | 'The False 9' | 'Football365' | 'talkSPORT' | 'GiveMeSport' | 'FourFourTwo' | 'TalkSport Football' | 'The Athletic' | 'ESPN FC' | 'Sky Sports Football' | 'BBC Sport Football' | 'Guardian Sport' | 'Independent Sport' | 'Telegraph Sport' | 'CNN Sports' | 'Transfermarkt' | '90min';
  publishedDate: string; // ISO 8601
}

export interface LeagueTableRow {
  rank: number;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDifference: number;
  points: number;
  team?: {
    id: number;
    name: string;
    logo: string;
  };
  all?: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: {
      for: number;
      against: number;
    };
  };
}

export interface PastPrediction extends Match {
  prediction: Prediction;
  actualResult: {
    homeScore: number;
    awayScore: number;
  };
  predictionTime?: string;
  confidence?: string;
  predictedScoreline?: string;
}

export interface PredictionAccuracy {
  id?: string;
  matchId: string;
  prediction: Prediction;
  actualResult: {
    homeScore: number;
    awayScore: number;
  };
  accuracy: {
    outcome: boolean;        // Win/Draw/Loss prediction correct
    scoreline: boolean;      // Exact scoreline correct
    btts: boolean;          // BTTS prediction correct
    goalLine: boolean;      // Over/Under 2.5 correct
    htft: boolean;          // HT/FT prediction correct
    scoreRange: boolean;    // Score range correct
    firstGoalscorer: boolean; // First goalscorer correct
    cleanSheet: boolean;    // Clean sheet prediction correct
    corners: boolean;       // Corner prediction correct
  };
  // Calibration and diagnostics (optional)
  calibration?: {
    brierScore?: number;         // Multi-class Brier score for 1X2
    logLoss?: number;            // Negative log-likelihood for actual outcome
    predicted?: { home: number; draw: number; away: number }; // Probabilities used (0-1)
    actualOutcome?: 'home' | 'draw' | 'away';                 // Realized outcome
    topProbability?: number;     // max of predicted probs (0-1)
    topMargin?: number;          // margin between top and second (0-1)
  };
  timestamp: string;
  cloudVerified?: boolean;
  cloudPredictionId?: string;
  integrityHash?: string;
  homeTeam?: string;
  awayTeam?: string;
  league?: League;
  matchDate?: string;
  predictionTime?: string;
  verified?: boolean;
  cloudStored?: boolean;
}

export interface AccuracyStats {
  totalPredictions: number;
  correctOutcomes: number;
  correctScorelines: number;
  correctBtts: number;
  correctGoalLine: number;
  correctHtft: number;
  correctScoreRange: number;
  correctFirstGoalscorer: number;
  correctCleanSheet: number;
  correctCorners: number;
  recentAccuracy: {
    last10: number;
    last20: number;
    last50: number;
  };
  overallAccuracy: number;
  verifiedPredictions?: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export interface PredictionContext {
  leagueTableSnippet?: string;
  homeTeamFormSnippet?: string;
  awayTeamFormSnippet?: string;
  headToHeadSnippet?: string;
  homeTeamStatsSnippet?: string;
  awayTeamStatsSnippet?: string;
  homeTeamInjuriesSnippet?: string;
  awayTeamInjuriesSnippet?: string;
  bttsHistoricSnippet?: string;
}

export interface AppData {
  teams: { [key: string]: Team };
  fixtures: Match[];
  leagueTables: { [key in League]?: LeagueTableRow[] };
}
