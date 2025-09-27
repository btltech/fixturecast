// Cloudflare Pages Function to check ML training data status
// GET /api/ml/status

export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    if (!env.ML_TRAINING_DB) {
      return new Response(JSON.stringify({ 
        error: 'ML_TRAINING_DB not configured',
        message: 'Database not available'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get overall statistics
    const overallStats = await env.ML_TRAINING_DB.prepare(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN actual_result IS NOT NULL THEN 1 END) as records_with_results,
        COUNT(CASE WHEN prediction_date >= DATE('now', '-7 days') THEN 1 END) as recent_records,
        AVG(CASE WHEN prediction_correct = 1 THEN 1.0 ELSE 0.0 END) as overall_accuracy,
        AVG(data_quality_overall) as avg_data_quality,
        AVG(prediction_confidence) as avg_confidence,
        MIN(prediction_date) as earliest_prediction,
        MAX(prediction_date) as latest_prediction
      FROM training_records
    `).first();

    // Get league breakdown
    const leagueStats = await env.ML_TRAINING_DB.prepare(`
      SELECT 
        league,
        COUNT(*) as predictions,
        COUNT(CASE WHEN actual_result IS NOT NULL THEN 1 END) as with_results,
        AVG(CASE WHEN prediction_correct = 1 THEN 1.0 ELSE 0.0 END) as accuracy,
        AVG(data_quality_overall) as data_quality
      FROM training_records
      GROUP BY league
      ORDER BY predictions DESC
    `).all();

    // Get recent performance trend
    const recentTrend = await env.ML_TRAINING_DB.prepare(`
      SELECT 
        DATE(prediction_date) as date,
        COUNT(*) as predictions,
        COUNT(CASE WHEN prediction_correct = 1 THEN 1 END) as correct,
        ROUND(AVG(CASE WHEN prediction_correct = 1 THEN 1.0 ELSE 0.0 END) * 100, 1) as accuracy,
        AVG(data_quality_overall) as data_quality
      FROM training_records 
      WHERE prediction_date >= DATE('now', '-14 days')
        AND actual_result IS NOT NULL
      GROUP BY DATE(prediction_date)
      ORDER BY date DESC
      LIMIT 14
    `).all();

    // Get model performance by provider
    const aiProviderStats = await env.ML_TRAINING_DB.prepare(`
      SELECT 
        ai_provider,
        COUNT(*) as predictions,
        AVG(CASE WHEN prediction_correct = 1 THEN 1.0 ELSE 0.0 END) as accuracy,
        AVG(prediction_confidence) as avg_confidence,
        AVG(data_quality_overall) as avg_data_quality
      FROM training_records
      WHERE actual_result IS NOT NULL
      GROUP BY ai_provider
    `).all();

    // Get feature importance insights
    const dataQualityImpact = await env.ML_TRAINING_DB.prepare(`
      SELECT 
        CASE 
          WHEN data_quality_overall >= 80 THEN 'Excellent (80%+)'
          WHEN data_quality_overall >= 60 THEN 'Good (60-79%)'
          WHEN data_quality_overall >= 40 THEN 'Fair (40-59%)'
          ELSE 'Poor (<40%)'
        END as data_quality_tier,
        COUNT(*) as predictions,
        AVG(CASE WHEN prediction_correct = 1 THEN 1.0 ELSE 0.0 END) as accuracy
      FROM training_records
      WHERE actual_result IS NOT NULL
      GROUP BY data_quality_tier
      ORDER BY AVG(data_quality_overall) DESC
    `).all();

    // Calculate readiness for ML training
    const readinessScore = calculateMLReadiness(overallStats);

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      
      // Overall status
      overview: {
        totalRecords: overallStats.total_records || 0,
        recordsWithResults: overallStats.records_with_results || 0,
        recentRecords: overallStats.recent_records || 0,
        overallAccuracy: Math.round((overallStats.overall_accuracy || 0) * 100),
        avgDataQuality: Math.round(overallStats.avg_data_quality || 0),
        avgConfidence: Math.round((overallStats.avg_confidence || 0) * 100),
        dateRange: {
          earliest: overallStats.earliest_prediction,
          latest: overallStats.latest_prediction
        }
      },

      // ML Training readiness
      mlReadiness: {
        score: readinessScore.score,
        status: readinessScore.status,
        recommendations: readinessScore.recommendations,
        canTrain: readinessScore.canTrain
      },

      // Detailed breakdowns
      byLeague: leagueStats.results?.map(league => ({
        league: league.league,
        predictions: league.predictions,
        withResults: league.with_results,
        accuracy: Math.round((league.accuracy || 0) * 100),
        dataQuality: Math.round(league.data_quality || 0),
        completionRate: Math.round((league.with_results / league.predictions) * 100)
      })) || [],

      byAiProvider: aiProviderStats.results?.map(provider => ({
        provider: provider.ai_provider,
        predictions: provider.predictions,
        accuracy: Math.round((provider.accuracy || 0) * 100),
        confidence: Math.round((provider.avg_confidence || 0) * 100),
        dataQuality: Math.round(provider.avg_data_quality || 0)
      })) || [],

      recentTrend: recentTrend.results?.map(day => ({
        date: day.date,
        predictions: day.predictions,
        correct: day.correct,
        accuracy: day.accuracy,
        dataQuality: Math.round(day.data_quality || 0)
      })) || [],

      dataQualityImpact: dataQualityImpact.results?.map(tier => ({
        tier: tier.data_quality_tier,
        predictions: tier.predictions,
        accuracy: Math.round((tier.accuracy || 0) * 100)
      })) || []

    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('ML status error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get ML training status',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

function calculateMLReadiness(stats) {
  let score = 0;
  let recommendations = [];
  
  // Check data volume
  const totalRecords = stats.total_records || 0;
  const withResults = stats.records_with_results || 0;
  
  if (withResults >= 100) score += 30;
  else if (withResults >= 50) score += 20;
  else if (withResults >= 20) score += 10;
  else recommendations.push('Need more predictions with actual results (current: ' + withResults + ', recommended: 50+)');
  
  // Check data quality
  const dataQuality = stats.avg_data_quality || 0;
  if (dataQuality >= 70) score += 25;
  else if (dataQuality >= 50) score += 15;
  else if (dataQuality >= 30) score += 5;
  else recommendations.push('Improve data quality (current: ' + Math.round(dataQuality) + '%, recommended: 70%+)');
  
  // Check accuracy baseline
  const accuracy = (stats.overall_accuracy || 0) * 100;
  if (accuracy >= 60) score += 25;
  else if (accuracy >= 50) score += 15;
  else if (accuracy >= 40) score += 10;
  else recommendations.push('Need better baseline accuracy (current: ' + Math.round(accuracy) + '%, recommended: 50%+)');
  
  // Check recency
  const recentRecords = stats.recent_records || 0;
  if (recentRecords >= 10) score += 20;
  else if (recentRecords >= 5) score += 10;
  else recommendations.push('Need more recent predictions (current: ' + recentRecords + ', recommended: 10+ in last 7 days)');
  
  let status;
  let canTrain = false;
  
  if (score >= 80) {
    status = 'Ready for ML Training';
    canTrain = true;
  } else if (score >= 60) {
    status = 'Almost Ready';
    canTrain = false;
  } else if (score >= 40) {
    status = 'Collecting Data';
    canTrain = false;
  } else {
    status = 'Getting Started';
    canTrain = false;
  }
  
  if (recommendations.length === 0) {
    recommendations.push('System is ready for machine learning training!');
  }
  
  return { score, status, recommendations, canTrain };
}