// Cloudflare Pages Function to initialize ML Training Database
// GET /api/ml/setup-database

export async function onRequest(context) {
  const { request, env } = context;
  
  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Check if D1 database is available
    if (!env.ML_TRAINING_DB) {
      return new Response(JSON.stringify({ 
        error: 'ML_TRAINING_DB not configured',
        message: 'Please set up the D1 database in Cloudflare dashboard'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create all required tables
    const tables = [
      {
        name: 'training_records',
        sql: `
          CREATE TABLE IF NOT EXISTS training_records (
            id TEXT PRIMARY KEY,
            match_id TEXT NOT NULL,
            prediction_date DATE NOT NULL,
            
            -- Match identifiers
            home_team TEXT NOT NULL,
            away_team TEXT NOT NULL,
            home_team_id INTEGER,
            away_team_id INTEGER,
            league TEXT NOT NULL,
            match_timestamp TEXT,
            
            -- Real-time data features
            home_attack_strength REAL DEFAULT 0,
            home_defense_strength REAL DEFAULT 0,
            away_attack_strength REAL DEFAULT 0,
            away_defense_strength REAL DEFAULT 0,
            
            -- Injury impact features
            home_injury_impact REAL DEFAULT 0,
            away_injury_impact REAL DEFAULT 0,
            home_key_players_out INTEGER DEFAULT 0,
            away_key_players_out INTEGER DEFAULT 0,
            
            -- Form momentum features
            home_form_momentum REAL DEFAULT 0,
            away_form_momentum REAL DEFAULT 0,
            home_recent_points INTEGER DEFAULT 0,
            away_recent_points INTEGER DEFAULT 0,
            home_form_trend TEXT,
            away_form_trend TEXT,
            
            -- Head-to-head features
            h2h_total_games INTEGER DEFAULT 0,
            h2h_home_wins INTEGER DEFAULT 0,
            h2h_draws INTEGER DEFAULT 0,
            h2h_away_wins INTEGER DEFAULT 0,
            h2h_btts_rate REAL DEFAULT 0,
            h2h_over25_rate REAL DEFAULT 0,
            h2h_avg_home_goals REAL DEFAULT 0,
            h2h_avg_away_goals REAL DEFAULT 0,
            
            -- Contextual features
            rest_days_home INTEGER DEFAULT 0,
            rest_days_away INTEGER DEFAULT 0,
            motivation_home TEXT DEFAULT 'medium',
            motivation_away TEXT DEFAULT 'medium',
            pressure_level TEXT DEFAULT 'medium',
            
            -- Data quality metrics
            data_quality_overall REAL DEFAULT 0,
            stats_availability REAL DEFAULT 0,
            injury_data_freshness REAL DEFAULT 0,
            form_data_completeness REAL DEFAULT 0,
            h2h_data_depth REAL DEFAULT 0,
            
            -- Model predictions
            predicted_home_win REAL NOT NULL,
            predicted_draw REAL NOT NULL,
            predicted_away_win REAL NOT NULL,
            predicted_btts_yes REAL,
            predicted_btts_no REAL,
            predicted_over25_yes REAL,
            predicted_over25_no REAL,
            predicted_home_score REAL,
            predicted_away_score REAL,
            prediction_confidence REAL NOT NULL,
            
            -- AI model context
            model_version TEXT DEFAULT 'v1.0.0',
            ai_provider TEXT DEFAULT 'gemini',
            prompt_version TEXT,
            key_factors_count INTEGER DEFAULT 0,
            
            -- Actual results
            actual_home_score INTEGER,
            actual_away_score INTEGER,
            actual_result TEXT,
            actual_btts BOOLEAN,
            actual_over25 BOOLEAN,
            actual_total_goals INTEGER,
            result_updated_at DATETIME,
            
            -- Learning metrics
            prediction_correct BOOLEAN,
            result_probability REAL,
            btts_prediction_correct BOOLEAN,
            over25_prediction_correct BOOLEAN,
            confidence_calibration_score REAL,
            brier_score REAL,
            
            -- Metadata
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'model_performance',
        sql: `
          CREATE TABLE IF NOT EXISTS model_performance (
            id TEXT PRIMARY KEY,
            model_version TEXT NOT NULL,
            test_period_start DATE NOT NULL,
            test_period_end DATE NOT NULL,
            
            total_predictions INTEGER DEFAULT 0,
            correct_1x2_predictions INTEGER DEFAULT 0,
            correct_btts_predictions INTEGER DEFAULT 0,
            correct_over25_predictions INTEGER DEFAULT 0,
            
            accuracy_1x2 REAL DEFAULT 0,
            accuracy_btts REAL DEFAULT 0,
            accuracy_over25 REAL DEFAULT 0,
            overall_accuracy REAL DEFAULT 0,
            
            avg_prediction_confidence REAL DEFAULT 0,
            confidence_calibration REAL DEFAULT 0,
            avg_brier_score REAL DEFAULT 0,
            
            premier_league_accuracy REAL DEFAULT 0,
            la_liga_accuracy REAL DEFAULT 0,
            serie_a_accuracy REAL DEFAULT 0,
            bundesliga_accuracy REAL DEFAULT 0,
            ligue_1_accuracy REAL DEFAULT 0,
            
            high_quality_accuracy REAL DEFAULT 0,
            low_quality_accuracy REAL DEFAULT 0,
            
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'feature_importance',
        sql: `
          CREATE TABLE IF NOT EXISTS feature_importance (
            id TEXT PRIMARY KEY,
            model_version TEXT NOT NULL,
            feature_name TEXT NOT NULL,
            importance_score REAL NOT NULL,
            
            feature_category TEXT,
            feature_type TEXT,
            
            league TEXT,
            home_away_context TEXT,
            match_importance TEXT,
            
            improvement_impact REAL,
            correlation_with_result REAL,
            
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
      }
    ];

    // Create tables
    const results = [];
    for (const table of tables) {
      try {
        await env.ML_TRAINING_DB.prepare(table.sql).run();
        results.push({ table: table.name, status: 'created' });
      } catch (error) {
        results.push({ table: table.name, status: 'error', error: error.message });
      }
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_training_records_date ON training_records(prediction_date)',
      'CREATE INDEX IF NOT EXISTS idx_training_records_league ON training_records(league)',
      'CREATE INDEX IF NOT EXISTS idx_training_records_model ON training_records(model_version)',
      'CREATE INDEX IF NOT EXISTS idx_training_records_result ON training_records(actual_result)',
      'CREATE INDEX IF NOT EXISTS idx_model_performance_version ON model_performance(model_version)',
      'CREATE INDEX IF NOT EXISTS idx_feature_importance_version ON feature_importance(model_version, feature_category)'
    ];

    for (const indexSql of indexes) {
      try {
        await env.ML_TRAINING_DB.prepare(indexSql).run();
      } catch (error) {
        console.warn('Index creation warning:', error.message);
      }
    }

    // Create helpful views
    const views = [
      `CREATE VIEW IF NOT EXISTS prediction_accuracy_summary AS
       SELECT 
         model_version,
         league,
         COUNT(*) as total_predictions,
         COUNT(CASE WHEN prediction_correct = 1 THEN 1 END) as correct_predictions,
         ROUND(AVG(CASE WHEN prediction_correct = 1 THEN 1.0 ELSE 0.0 END) * 100, 2) as accuracy_percentage,
         ROUND(AVG(prediction_confidence), 3) as avg_confidence,
         ROUND(AVG(confidence_calibration_score), 3) as calibration_score,
         ROUND(AVG(data_quality_overall), 1) as avg_data_quality
       FROM training_records 
       WHERE actual_result IS NOT NULL
       GROUP BY model_version, league`,

      `CREATE VIEW IF NOT EXISTS recent_performance AS  
       SELECT 
         DATE(prediction_date) as date,
         COUNT(*) as predictions_made,
         COUNT(CASE WHEN prediction_correct = 1 THEN 1 END) as correct,
         ROUND(AVG(CASE WHEN prediction_correct = 1 THEN 1.0 ELSE 0.0 END) * 100, 1) as accuracy,
         ROUND(AVG(prediction_confidence), 2) as avg_confidence,
         COUNT(CASE WHEN data_quality_overall > 70 THEN 1 END) as high_quality_predictions
       FROM training_records 
       WHERE prediction_date >= DATE('now', '-30 days')
         AND actual_result IS NOT NULL
       GROUP BY DATE(prediction_date)
       ORDER BY date DESC`
    ];

    for (const viewSql of views) {
      try {
        await env.ML_TRAINING_DB.prepare(viewSql).run();
      } catch (error) {
        console.warn('View creation warning:', error.message);
      }
    }

    // Test database connectivity
    const testQuery = await env.ML_TRAINING_DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all();

    return new Response(JSON.stringify({
      success: true,
      message: 'ML Training Database initialized successfully',
      tables: results,
      created_tables: testQuery.results?.map(r => r.name) || [],
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Database setup error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Database initialization failed',
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