/**
 * AWS Lambda Function: Prediction Update
 * Triggered by EventBridge Scheduler to update match predictions
 */

const AWS = require('aws-sdk');
const https = require('https');

// Initialize AWS services
const eventbridge = new AWS.EventBridge();
const dynamodb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();

/**
 * Lambda handler for prediction updates
 */
exports.handler = async (event, context) => {
  console.log('Prediction Update Lambda triggered:', JSON.stringify(event, null, 2));
  
  const startTime = Date.now();
  let processedMatches = 0;
  let errors = [];

  try {
    // Parse the event payload
    const {
      type = 'scheduled-prediction-update',
      automated = true,
      matchIds = [],
      leagueIds = [],
      forceUpdate = false
    } = event;

    console.log(`Processing ${type} for ${matchIds.length || 'all'} matches`);

    // Get matches to update
    let matchesToUpdate = [];
    
    if (matchIds.length > 0) {
      // Update specific matches
      matchesToUpdate = await getMatchesByIds(matchIds);
    } else {
      // Get upcoming matches for the next 48 hours
      matchesToUpdate = await getUpcomingMatches(leagueIds);
    }

    console.log(`Found ${matchesToUpdate.length} matches to update`);

    // Process matches in batches to avoid timeout
    const batchSize = 10;
    for (let i = 0; i < matchesToUpdate.length; i += batchSize) {
      const batch = matchesToUpdate.slice(i, i + batchSize);
      
      try {
        const batchResults = await Promise.allSettled(
          batch.map(match => updateMatchPrediction(match, forceUpdate))
        );
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            processedMatches++;
          } else {
            errors.push({
              matchId: batch[index].id,
              error: result.reason?.message || 'Unknown error'
            });
          }
        });
        
      } catch (batchError) {
        console.error('Batch processing error:', batchError);
        errors.push({
          batch: i / batchSize + 1,
          error: batchError.message
        });
      }
    }

    // Store execution results
    const executionResult = {
      timestamp: new Date().toISOString(),
      type,
      automated,
      duration: Date.now() - startTime,
      processedMatches,
      totalMatches: matchesToUpdate.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 10) // Limit error details
    };

    await storeExecutionResult(executionResult);

    // Send notification if there are significant errors
    if (errors.length > matchesToUpdate.length * 0.1) { // More than 10% errors
      await sendErrorAlert(executionResult);
    }

    console.log('Prediction update completed:', {
      processedMatches,
      totalMatches: matchesToUpdate.length,
      errors: errors.length,
      duration: Date.now() - startTime
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        processedMatches,
        totalMatches: matchesToUpdate.length,
        errors: errors.length,
        duration: Date.now() - startTime
      })
    };

  } catch (error) {
    console.error('Lambda execution error:', error);
    
    // Store error result
    const errorResult = {
      timestamp: new Date().toISOString(),
      type: event.type || 'unknown',
      automated: event.automated || false,
      duration: Date.now() - startTime,
      processedMatches: 0,
      totalMatches: 0,
      errors: 1,
      errorDetails: [{ error: error.message, stack: error.stack }]
    };

    await storeExecutionResult(errorResult);
    await sendErrorAlert(errorResult);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      })
    };
  }
};

/**
 * Get matches by specific IDs
 */
async function getMatchesByIds(matchIds) {
  try {
    // Query DynamoDB for specific matches
    const params = {
      RequestItems: {
        [process.env.MATCHES_TABLE]: {
          Keys: matchIds.map(id => ({ id }))
        }
      }
    };

    const result = await dynamodb.batchGet(params).promise();
    return result.Responses[process.env.MATCHES_TABLE] || [];
    
  } catch (error) {
    console.error('Error fetching matches by IDs:', error);
    throw error;
  }
}

/**
 * Get upcoming matches for prediction updates
 */
async function getUpcomingMatches(leagueIds = []) {
  try {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours ahead

    const params = {
      TableName: process.env.MATCHES_TABLE,
      FilterExpression: '#matchDate BETWEEN :startDate AND :endDate',
      ExpressionAttributeNames: {
        '#matchDate': 'date'
      },
      ExpressionAttributeValues: {
        ':startDate': now.toISOString(),
        ':endDate': futureDate.toISOString()
      }
    };

    // Add league filter if specified
    if (leagueIds.length > 0) {
      params.FilterExpression += ' AND #leagueId IN (:leagueIds)';
      params.ExpressionAttributeNames['#leagueId'] = 'leagueId';
      params.ExpressionAttributeValues[':leagueIds'] = leagueIds;
    }

    const result = await dynamodb.scan(params).promise();
    return result.Items || [];
    
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    throw error;
  }
}

/**
 * Update prediction for a single match
 */
async function updateMatchPrediction(match, forceUpdate = false) {
  try {
    // Check if prediction needs update
    if (!forceUpdate && match.lastPredictionUpdate) {
      const lastUpdate = new Date(match.lastPredictionUpdate);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
      
      // Skip if updated within last 6 hours (unless forced)
      if (hoursSinceUpdate < 6) {
        console.log(`Skipping match ${match.id} - updated ${hoursSinceUpdate.toFixed(1)} hours ago`);
        return;
      }
    }

    // Call FixtureCast prediction API
    const predictionData = await callPredictionAPI(match);
    
    // Store updated prediction
    await storePrediction(match.id, predictionData);
    
    console.log(`Updated prediction for match ${match.id}`);
    return predictionData;
    
  } catch (error) {
    console.error(`Error updating prediction for match ${match.id}:`, error);
    throw error;
  }
}

/**
 * Call the FixtureCast prediction API
 */
async function callPredictionAPI(match) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      date: match.date,
      automated: true
    });

    const options = {
      hostname: process.env.FIXTURECAST_API_HOST || 'api.fixturecast.com',
      port: 443,
      path: '/api/predictions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FIXTURECAST_API_KEY}`,
        'Content-Length': payload.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(response);
          } else {
            reject(new Error(`API error: ${res.statusCode} - ${response.error || data}`));
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse API response: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Store prediction in DynamoDB
 */
async function storePrediction(matchId, predictionData) {
  const params = {
    TableName: process.env.PREDICTIONS_TABLE,
    Item: {
      id: `${matchId}_${Date.now()}`,
      matchId,
      prediction: predictionData,
      timestamp: new Date().toISOString(),
      automated: true,
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
    }
  };

  await dynamodb.put(params).promise();

  // Update match record with latest prediction timestamp
  const updateParams = {
    TableName: process.env.MATCHES_TABLE,
    Key: { id: matchId },
    UpdateExpression: 'SET lastPredictionUpdate = :timestamp',
    ExpressionAttributeValues: {
      ':timestamp': new Date().toISOString()
    }
  };

  await dynamodb.update(updateParams).promise();
}

/**
 * Store execution result for monitoring
 */
async function storeExecutionResult(result) {
  try {
    const params = {
      TableName: process.env.EXECUTION_LOG_TABLE,
      Item: {
        id: `prediction_update_${Date.now()}`,
        executionType: 'prediction_update',
        ...result,
        ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days TTL
      }
    };

    await dynamodb.put(params).promise();
  } catch (error) {
    console.error('Error storing execution result:', error);
  }
}

/**
 * Send error alert via SNS
 */
async function sendErrorAlert(executionResult) {
  try {
    if (!process.env.ERROR_ALERT_TOPIC_ARN) {
      console.log('No error alert topic configured');
      return;
    }

    const message = {
      service: 'FixtureCast Prediction Update',
      timestamp: executionResult.timestamp,
      severity: executionResult.errors > 0 ? 'HIGH' : 'LOW',
      summary: `Prediction update completed with ${executionResult.errors} errors out of ${executionResult.totalMatches} matches`,
      details: executionResult
    };

    const params = {
      TopicArn: process.env.ERROR_ALERT_TOPIC_ARN,
      Message: JSON.stringify(message, null, 2),
      Subject: `FixtureCast Alert: Prediction Update ${executionResult.errors > 0 ? 'Errors' : 'Completed'}`
    };

    await sns.publish(params).promise();
    console.log('Error alert sent');
    
  } catch (error) {
    console.error('Error sending alert:', error);
  }
}