// Comprehensive diagnostic tool for incomplete predictions
// Identifies and fixes incomplete predictions with detailed analysis

import fetch from 'node-fetch';
import { Match, Prediction } from '../types';

const FIXTURES_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev/fixtures/today';
const PREDICTIONS_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev/predictions/today';
const TRIGGER_ENDPOINT = 'https://fixturecast-cron-worker.btltech.workers.dev/trigger-predictions';

interface PredictionDiagnostic {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  issues: string[];
  severity: 'critical' | 'warning' | 'minor';
  prediction: Prediction | null;
  canRetry: boolean;
}

interface DiagnosticReport {
  totalMatches: number;
  completePredictions: number;
  incompletePredictions: number;
  criticalIssues: number;
  warningIssues: number;
  minorIssues: number;
  diagnostics: PredictionDiagnostic[];
  recommendations: string[];
}

async function fetchFixtures(): Promise<Match[]> {
  try {
    const res = await fetch(FIXTURES_ENDPOINT);
    if (!res.ok) throw new Error(`Failed to fetch fixtures: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    return [];
  }
}

async function fetchPredictions(): Promise<{ [fixtureId: string]: Prediction }> {
  try {
    const res = await fetch(PREDICTIONS_ENDPOINT);
    if (!res.ok) throw new Error(`Failed to fetch predictions: ${res.status}`);
    const data = await res.json();
    return (typeof data === 'object' && !Array.isArray(data) && data !== null) ? data : {};
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return {};
  }
}

function analyzePredictionCompleteness(prediction: Prediction | null, match: Match): PredictionDiagnostic {
  const issues: string[] = [];
  let severity: 'critical' | 'warning' | 'minor' = 'minor';
  
  if (!prediction) {
    issues.push('No prediction found');
    severity = 'critical';
    return {
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league?.name || 'Unknown',
      issues,
      severity,
      prediction: null,
      canRetry: true
    };
  }

  // Critical issues (prediction unusable)
  if (typeof prediction.homeWinProbability !== 'number' || 
      typeof prediction.awayWinProbability !== 'number' || 
      typeof prediction.drawProbability !== 'number') {
    issues.push('Missing core probability data');
    severity = 'critical';
  }

  if (!prediction.predictedScoreline || typeof prediction.predictedScoreline !== 'string') {
    issues.push('Missing predicted scoreline');
    severity = severity === 'critical' ? 'critical' : 'warning';
  }

  if (!prediction.confidence || typeof prediction.confidence !== 'string') {
    issues.push('Missing confidence level');
    severity = severity === 'critical' ? 'critical' : 'warning';
  }

  // Warning issues (prediction usable but incomplete)
  if (!prediction.keyFactors || !Array.isArray(prediction.keyFactors) || prediction.keyFactors.length === 0) {
    issues.push('Missing key factors analysis');
    severity = severity === 'critical' ? 'critical' : 'warning';
  }

  if (!prediction.goalLine || typeof prediction.goalLine !== 'object') {
    issues.push('Missing goal line prediction');
    severity = severity === 'critical' ? 'critical' : 'warning';
  }

  if (!prediction.btts || typeof prediction.btts !== 'object') {
    issues.push('Missing BTTS prediction');
    severity = severity === 'critical' ? 'critical' : 'warning';
  }

  // Minor issues (enhancement opportunities)
  if (!prediction.htft || typeof prediction.htft !== 'object') {
    issues.push('Missing HT/FT prediction');
    severity = severity === 'critical' ? 'critical' : (severity === 'warning' ? 'warning' : 'minor');
  }

  if (!prediction.scoreRange || typeof prediction.scoreRange !== 'object') {
    issues.push('Missing score range prediction');
    severity = severity === 'critical' ? 'critical' : (severity === 'warning' ? 'warning' : 'minor');
  }

  if (!prediction.expectedGoals || typeof prediction.expectedGoals !== 'object') {
    issues.push('Missing expected goals prediction');
    severity = severity === 'critical' ? 'critical' : (severity === 'warning' ? 'warning' : 'minor');
  }

  if (!prediction.confidencePercentage || typeof prediction.confidencePercentage !== 'number') {
    issues.push('Missing confidence percentage');
    severity = severity === 'critical' ? 'critical' : (severity === 'warning' ? 'warning' : 'minor');
  }

  if (!prediction.confidenceReason || typeof prediction.confidenceReason !== 'string') {
    issues.push('Missing confidence reasoning');
    severity = severity === 'critical' ? 'critical' : (severity === 'warning' ? 'warning' : 'minor');
  }

  // Check for data quality issues
  const totalProb = (prediction.homeWinProbability || 0) + 
                   (prediction.drawProbability || 0) + 
                   (prediction.awayWinProbability || 0);
  
  if (Math.abs(totalProb - 1.0) > 0.01) {
    issues.push(`Probability sum is ${totalProb.toFixed(3)} (should be 1.0)`);
    severity = severity === 'critical' ? 'critical' : 'warning';
  }

  return {
    matchId: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    league: match.league?.name || 'Unknown',
    issues,
    severity,
    prediction,
    canRetry: severity === 'critical' || severity === 'warning'
  };
}

function generateRecommendations(report: DiagnosticReport): string[] {
  const recommendations: string[] = [];
  
  if (report.criticalIssues > 0) {
    recommendations.push(`🚨 ${report.criticalIssues} critical issues found - these predictions need immediate retry`);
  }
  
  if (report.warningIssues > 0) {
    recommendations.push(`⚠️ ${report.warningIssues} warning issues found - these predictions are partially usable but should be improved`);
  }
  
  if (report.minorIssues > 0) {
    recommendations.push(`ℹ️ ${report.minorIssues} minor issues found - these are enhancement opportunities`);
  }
  
  const criticalMatches = report.diagnostics.filter(d => d.severity === 'critical');
  if (criticalMatches.length > 0) {
    recommendations.push(`Run: curl -s '${TRIGGER_ENDPOINT}?resume=true&wave=20&model=gemini-1.5-flash' to retry critical predictions`);
  }
  
  const warningMatches = report.diagnostics.filter(d => d.severity === 'warning');
  if (warningMatches.length > 0) {
    recommendations.push(`Consider running: curl -s '${TRIGGER_ENDPOINT}?resume=true&wave=10&model=deepseek-chat' for warning-level improvements`);
  }
  
  if (report.incompletePredictions === 0) {
    recommendations.push('✅ All predictions appear complete!');
  }
  
  return recommendations;
}

async function diagnoseIncompletePredictions(): Promise<DiagnosticReport> {
  console.log('🔍 Starting comprehensive prediction diagnosis...');
  
  const fixtures = await fetchFixtures();
  const predictions = await fetchPredictions();
  
  console.log(`📊 Found ${fixtures.length} fixtures and ${Object.keys(predictions).length} predictions`);
  
  const diagnostics: PredictionDiagnostic[] = [];
  let completePredictions = 0;
  let incompletePredictions = 0;
  let criticalIssues = 0;
  let warningIssues = 0;
  let minorIssues = 0;
  
  for (const match of fixtures) {
    const prediction = predictions[match.id] || null;
    const diagnostic = analyzePredictionCompleteness(prediction, match);
    
    diagnostics.push(diagnostic);
    
    if (diagnostic.severity === 'critical') {
      incompletePredictions++;
      criticalIssues++;
    } else if (diagnostic.severity === 'warning') {
      incompletePredictions++;
      warningIssues++;
    } else if (diagnostic.severity === 'minor') {
      minorIssues++;
    } else {
      completePredictions++;
    }
  }
  
  const report: DiagnosticReport = {
    totalMatches: fixtures.length,
    completePredictions,
    incompletePredictions,
    criticalIssues,
    warningIssues,
    minorIssues,
    diagnostics,
    recommendations: []
  };
  
  report.recommendations = generateRecommendations(report);
  
  return report;
}

function printDetailedReport(report: DiagnosticReport): void {
  console.log('\n📋 PREDICTION DIAGNOSTIC REPORT');
  console.log('='.repeat(50));
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total Matches: ${report.totalMatches}`);
  console.log(`   Complete Predictions: ${report.completePredictions} (${((report.completePredictions / report.totalMatches) * 100).toFixed(1)}%)`);
  console.log(`   Incomplete Predictions: ${report.incompletePredictions} (${((report.incompletePredictions / report.totalMatches) * 100).toFixed(1)}%)`);
  console.log(`   Critical Issues: ${report.criticalIssues}`);
  console.log(`   Warning Issues: ${report.warningIssues}`);
  console.log(`   Minor Issues: ${report.minorIssues}`);
  
  if (report.criticalIssues > 0) {
    console.log(`\n🚨 CRITICAL ISSUES (${report.criticalIssues}):`);
    report.diagnostics
      .filter(d => d.severity === 'critical')
      .forEach(d => {
        console.log(`   ${d.homeTeam} vs ${d.awayTeam} (${d.league})`);
        console.log(`     Issues: ${d.issues.join(', ')}`);
      });
  }
  
  if (report.warningIssues > 0) {
    console.log(`\n⚠️ WARNING ISSUES (${report.warningIssues}):`);
    report.diagnostics
      .filter(d => d.severity === 'warning')
      .forEach(d => {
        console.log(`   ${d.homeTeam} vs ${d.awayTeam} (${d.league})`);
        console.log(`     Issues: ${d.issues.join(', ')}`);
      });
  }
  
  console.log(`\n💡 RECOMMENDATIONS:`);
  report.recommendations.forEach(rec => console.log(`   ${rec}`));
  
  console.log('\n' + '='.repeat(50));
}

async function main() {
  try {
    const report = await diagnoseIncompletePredictions();
    printDetailedReport(report);
    
    // Return exit code based on severity
    if (report.criticalIssues > 0) {
      console.log('\n❌ Critical issues found - action required');
      process.exit(1);
    } else if (report.warningIssues > 0) {
      console.log('\n⚠️ Warning issues found - improvement recommended');
      process.exit(0);
    } else {
      console.log('\n✅ All predictions are in good shape!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { diagnoseIncompletePredictions, analyzePredictionCompleteness, DiagnosticReport, PredictionDiagnostic };
