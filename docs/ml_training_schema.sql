-- ML Training Database Schema for Cloudflare D1
-- Run this to set up structured ML training data storage

-- Core training records table
CREATE TABLE training_records (
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
    
    -- Real-time data features (from your enhanced system)
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
    home_form_trend TEXT, -- 'improving', 'declining', 'stable'
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
    ai_provider TEXT DEFAULT 'gemini', -- 'gemini', 'deepseek'
    prompt_version TEXT,
    key_factors_count INTEGER DEFAULT 0,
    
    -- Actual results (populated after match)
    actual_home_score INTEGER,
    actual_away_score INTEGER,
    actual_result TEXT, -- 'H' (home win), 'D' (draw), 'A' (away win)
    actual_btts BOOLEAN,
    actual_over25 BOOLEAN,
    actual_total_goals INTEGER,
    result_updated_at DATETIME,
    
    -- Learning metrics (calculated after result)
    prediction_correct BOOLEAN,
    result_probability REAL, -- the probability we assigned to actual outcome
    btts_prediction_correct BOOLEAN,
    over25_prediction_correct BOOLEAN,
    confidence_calibration_score REAL, -- how well-calibrated our confidence was
    brier_score REAL, -- overall prediction accuracy metric
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Model performance tracking
CREATE TABLE model_performance (
    id TEXT PRIMARY KEY,
    model_version TEXT NOT NULL,
    test_period_start DATE NOT NULL,
    test_period_end DATE NOT NULL,
    
    -- Overall performance
    total_predictions INTEGER DEFAULT 0,
    correct_1x2_predictions INTEGER DEFAULT 0,
    correct_btts_predictions INTEGER DEFAULT 0,
    correct_over25_predictions INTEGER DEFAULT 0,
    
    -- Accuracy rates
    accuracy_1x2 REAL DEFAULT 0,
    accuracy_btts REAL DEFAULT 0,
    accuracy_over25 REAL DEFAULT 0,
    overall_accuracy REAL DEFAULT 0,
    
    -- Confidence metrics
    avg_prediction_confidence REAL DEFAULT 0,
    confidence_calibration REAL DEFAULT 0,
    avg_brier_score REAL DEFAULT 0,
    
    -- League-specific performance
    premier_league_accuracy REAL DEFAULT 0,
    la_liga_accuracy REAL DEFAULT 0,
    serie_a_accuracy REAL DEFAULT 0,
    bundesliga_accuracy REAL DEFAULT 0,
    ligue_1_accuracy REAL DEFAULT 0,
    
    -- Data quality impact
    high_quality_accuracy REAL DEFAULT 0, -- data_quality > 70%
    low_quality_accuracy REAL DEFAULT 0,  -- data_quality < 50%
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Feature importance tracking
CREATE TABLE feature_importance (
    id TEXT PRIMARY KEY,
    model_version TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    importance_score REAL NOT NULL,
    
    -- Feature categorization
    feature_category TEXT, -- 'injury', 'form', 'h2h', 'stats', 'contextual'
    feature_type TEXT,     -- 'numerical', 'categorical', 'boolean'
    
    -- Context-specific importance
    league TEXT,
    home_away_context TEXT, -- 'home_advantage', 'away_resilience', 'neutral'
    match_importance TEXT,  -- 'high_stakes', 'regular', 'low_stakes'
    
    -- Learning insights
    improvement_impact REAL, -- how much this feature improved accuracy
    correlation_with_result REAL,
    
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Model deployment tracking
CREATE TABLE model_deployments (
    id TEXT PRIMARY KEY,
    model_version TEXT NOT NULL,
    previous_version TEXT,
    
    -- Deployment info
    deployed_at DATETIME NOT NULL,
    deployed_by TEXT DEFAULT 'auto-pipeline',
    deployment_trigger TEXT, -- 'accuracy_improvement', 'scheduled', 'manual'
    
    -- Performance comparison
    previous_accuracy REAL,
    new_accuracy REAL,
    accuracy_improvement REAL,
    
    -- Validation results
    validation_accuracy REAL,
    validation_sample_size INTEGER,
    confidence_threshold REAL,
    
    -- Rollback info
    rollback_threshold REAL DEFAULT 0.02, -- rollback if accuracy drops > 2%
    auto_rollback_enabled BOOLEAN DEFAULT 1,
    
    -- Status
    status TEXT DEFAULT 'active', -- 'active', 'rolled_back', 'superseded'
    rollback_reason TEXT,
    rollback_at DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Training job tracking
CREATE TABLE training_jobs (
    id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL, -- 'weekly_retrain', 'experiment', 'hotfix'
    
    -- Training parameters  
    training_data_start DATE,
    training_data_end DATE,
    training_sample_size INTEGER,
    validation_sample_size INTEGER,
    
    -- Job execution
    started_at DATETIME,
    completed_at DATETIME,
    status TEXT DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed'
    
    -- Results
    model_version_output TEXT,
    training_accuracy REAL,
    validation_accuracy REAL,
    feature_count INTEGER,
    
    -- Performance metrics
    execution_time_seconds INTEGER,
    memory_used_mb INTEGER,
    cpu_time_seconds INTEGER,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_training_records_date ON training_records(prediction_date);
CREATE INDEX idx_training_records_league ON training_records(league);
CREATE INDEX idx_training_records_model ON training_records(model_version);
CREATE INDEX idx_training_records_result ON training_records(actual_result);
CREATE INDEX idx_model_performance_version ON model_performance(model_version);
CREATE INDEX idx_feature_importance_version ON feature_importance(model_version, feature_category);
CREATE INDEX idx_training_jobs_status ON training_jobs(status, created_at);

-- Views for common queries
CREATE VIEW prediction_accuracy_summary AS
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
GROUP BY model_version, league;

CREATE VIEW recent_performance AS  
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
ORDER BY date DESC;