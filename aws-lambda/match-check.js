/**
 * AWS Lambda Function: Match Status Check
 * Triggered by EventBridge Scheduler to check live match status and results
 */

const AWS = require('aws-sdk');
const https = require('https');

// Initialize AWS services
const dynamodb = new AWS.DynamoDB.DocumentClient();
const eventbridge = new AWS.EventBridge();
const sns = new AWS.SNS();

/**
 * Lambda handler for match status checking
 */
exports.handler = async (event, context) => {
  console.log('Match Check Lambda triggered:', JSON.stringify(event, null, 2));
  
  const startTime = Date.now();
  let checkedMatches = 0;
  let updatedMatches = 0;
  let liveMatches = 0;
  let errors = [];

  try {
    // Parse the event payload
    const {
      type = 'scheduled-match-check',
      automated = true,
      matchIds = [],
      checkLiveOnly = false
    } = event;

    console.log(`Processing ${type} for ${matchIds.length || 'all'} matches`);

    // Get matches to check
    let matchesToCheck = [];
    
    if (matchIds.length > 0) {
      // Check specific matches
      matchesToCheck = await getMatchesByIds(matchIds);
    } else {
      // Get matches that need status checking
      matchesToCheck = await getMatchesToCheck(checkLiveOnly);
    }

    console.log(`Found ${matchesToCheck.length} matches to check`);

    // Process matches in batches
    const batchSize = 15;
    for (let i = 0; i < matchesToCheck.length; i += batchSize) {
      const batch = matchesToCheck.slice(i, i + batchSize);
      
      try {
        const batchResults = await Promise.allSettled(
          batch.map(match => checkMatchStatus(match))
        );
        
        batchResults.forEach((result, index) => {
          checkedMatches++;
          
          if (result.status === 'fulfilled') {
            const updateResult = result.value;
            if (updateResult.updated) {
              updatedMatches++;
            }
            if (updateResult.isLive) {
              liveMatches++;
            }
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

    // Schedule additional checks for live matches if needed
    if (liveMatches > 0) {
      await scheduleLiveMatchUpdates(matchesToCheck.filter(m => m.status === 'live'));
    }

    // Store execution results
    const executionResult = {
      timestamp: new Date().toISOString(),
      type,
      automated,
      duration: Date.now() - startTime,
      checkedMatches,
      updatedMatches,
      liveMatches,
      totalMatches: matchesToCheck.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 10)
    };

    await storeExecutionResult(executionResult);

    // Send notification if there are significant errors
    if (errors.length > matchesToCheck.length * 0.15) {
      await sendErrorAlert(executionResult);
    }

    console.log('Match check completed:', {
      checkedMatches,
      updatedMatches,
      liveMatches,
      errors: errors.length,
      duration: Date.now() - startTime
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        checkedMatches,
        updatedMatches,
        liveMatches,
        errors: errors.length,
        duration: Date.now() - startTime
      })
    };

  } catch (error) {
    console.error('Lambda execution error:', error);
    
    const errorResult = {
      timestamp: new Date().toISOString(),
      type: event.type || 'unknown',
      automated: event.automated || false,
      duration: Date.now() - startTime,
      checkedMatches: 0,
      updatedMatches: 0,
      liveMatches: 0,
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
 * Get matches that need status checking
 */
async function getMatchesToCheck(checkLiveOnly = false) {
  try {
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const twoHoursAhead = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    let filterExpression, expressionAttributeValues;

    if (checkLiveOnly) {
      // Only check matches currently live or just finished
      filterExpression = '#status IN (:live, :halftime) OR (#status = :finished AND #lastCheck < :recentCheck)';
      expressionAttributeValues = {
        ':live': 'live',
        ':halftime': 'halftime',
        ':finished': 'finished',
        ':recentCheck': new Date(now.getTime() - 30 * 60 * 1000).toISOString()
      };
    } else {
      // Check matches that are starting soon, live, or recently finished
      filterExpression = '(#matchDate BETWEEN :startCheck AND :endCheck) OR #status IN (:live, :halftime)';
      expressionAttributeValues = {
        ':startCheck': sixHoursAgo.toISOString(),
        ':endCheck': twoHoursAhead.toISOString(),
        ':live': 'live',
        ':halftime': 'halftime'
      };
    }

    const params = {
      TableName: process.env.MATCHES_TABLE,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: {
        '#matchDate': 'date',
        '#status': 'status',
        '#lastCheck': 'lastStatusCheck'
      },
      ExpressionAttributeValues: expressionAttributeValues
    };

    const result = await dynamodb.scan(params).promise();
    return result.Items || [];
    
  } catch (error) {
    console.error('Error fetching matches to check:', error);
    throw error;
  }
}

/**
 * Check status for a single match
 */
async function checkMatchStatus(match) {
  try {
    // Call Football API to get current match status
    const matchData = await callFootballAPI(match.id);
    
    let updated = false;
    let isLive = false;

    if (matchData) {
      const newStatus = determineMatchStatus(matchData);
      isLive = newStatus === 'live' || newStatus === 'halftime';

      // Check if status changed
      if (match.status !== newStatus || 
          (isLive && shouldUpdateLiveMatch(match))) {
        
        await updateMatchStatus(match.id, matchData, newStatus);
        updated = true;

        // Trigger real-time updates if match is live
        if (isLive) {
          await publishLiveUpdate(match.id, matchData);
        }

        // Check predictions if match is finished
        if (newStatus === 'finished' && match.status !== 'finished') {
          await triggerPredictionValidation(match.id, matchData);
        }
      }
    }

    console.log(`Checked match ${match.id}: ${match.status} -> ${matchData ? determineMatchStatus(matchData) : 'no data'}`);
    
    return {
      matchId: match.id,
      updated,
      isLive,
      previousStatus: match.status,
      currentStatus: matchData ? determineMatchStatus(matchData) : match.status
    };
    
  } catch (error) {
    console.error(`Error checking match ${match.id}:`, error);
    throw error;
  }
}

/**
 * Call Football API to get match data
 */
async function callFootballAPI(matchId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'v3.football.api-sports.io',
      port: 443,
      path: `/fixtures?id=${matchId}`,
      method: 'GET',
      headers: {
        'x-rapidapi-key': process.env.FOOTBALL_API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
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
          if (res.statusCode === 200 && response.response && response.response.length > 0) {
            resolve(response.response[0]);
          } else {
            console.warn(`No data for match ${matchId}: ${res.statusCode}`);
            resolve(null);
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse API response: ${parseError.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Determine match status from API data
 */
function determineMatchStatus(matchData) {
  if (!matchData.fixture || !matchData.fixture.status) {
    return 'scheduled';
  }

  const status = matchData.fixture.status.short;
  
  switch (status) {
    case 'NS': // Not Started
    case 'TBD': // To Be Defined
      return 'scheduled';
    case '1H': // First Half
    case '2H': // Second Half
    case 'ET': // Extra Time
    case 'P': // Penalty
      return 'live';
    case 'HT': // Half Time
      return 'halftime';
    case 'FT': // Full Time
    case 'AET': // After Extra Time
    case 'PEN': // Penalty
      return 'finished';
    case 'CANC': // Cancelled
    case 'ABD': // Abandoned
    case 'PST': // Postponed
    case 'SUSP': // Suspended
      return 'cancelled';
    default:
      return 'scheduled';
  }
}

/**
 * Check if live match should be updated
 */
function shouldUpdateLiveMatch(match) {
  if (!match.lastStatusCheck) return true;
  
  const lastCheck = new Date(match.lastStatusCheck);
  const now = new Date();
  const minutesSinceUpdate = (now - lastCheck) / (1000 * 60);
  
  // Update live matches every 2 minutes
  return minutesSinceUpdate >= 2;
}

/**
 * Update match status in DynamoDB
 */
async function updateMatchStatus(matchId, matchData, newStatus) {
  const updateData = {
    status: newStatus,
    lastStatusCheck: new Date().toISOString(),
    fixture: matchData.fixture
  };

  // Add score data if available
  if (matchData.goals) {
    updateData.score = {
      home: matchData.goals.home,
      away: matchData.goals.away
    };
  }

  // Add live data for live matches
  if (newStatus === 'live' || newStatus === 'halftime') {
    updateData.liveData = {
      elapsed: matchData.fixture.status.elapsed,
      extraTime: matchData.fixture.status.extra,
      events: matchData.events || []
    };
  }

  const params = {
    TableName: process.env.MATCHES_TABLE,
    Key: { id: matchId },
    UpdateExpression: 'SET #status = :status, #lastCheck = :lastCheck, #fixture = :fixture',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#lastCheck': 'lastStatusCheck',
      '#fixture': 'fixture'
    },
    ExpressionAttributeValues: {
      ':status': newStatus,
      ':lastCheck': updateData.lastStatusCheck,
      ':fixture': updateData.fixture
    }
  };

  // Add score and live data if present
  if (updateData.score) {
    params.UpdateExpression += ', #score = :score';
    params.ExpressionAttributeNames['#score'] = 'score';
    params.ExpressionAttributeValues[':score'] = updateData.score;
  }

  if (updateData.liveData) {
    params.UpdateExpression += ', #liveData = :liveData';
    params.ExpressionAttributeNames['#liveData'] = 'liveData';
    params.ExpressionAttributeValues[':liveData'] = updateData.liveData;
  }

  await dynamodb.update(params).promise();
}

/**
 * Publish live update to EventBridge for real-time notifications
 */
async function publishLiveUpdate(matchId, matchData) {
  try {
    const eventDetail = {
      matchId,
      status: determineMatchStatus(matchData),
      score: matchData.goals || { home: 0, away: 0 },
      elapsed: matchData.fixture.status.elapsed,
      timestamp: new Date().toISOString()
    };

    const params = {
      Entries: [{
        Source: 'fixturecast.match-checker',
        DetailType: 'Live Match Update',
        Detail: JSON.stringify(eventDetail),
        EventBusName: process.env.EVENT_BUS_NAME || 'default'
      }]
    };

    await eventbridge.putEvents(params).promise();
    console.log(`Published live update for match ${matchId}`);
    
  } catch (error) {
    console.error('Error publishing live update:', error);
  }
}

/**
 * Trigger prediction validation for finished matches
 */
async function triggerPredictionValidation(matchId, matchData) {
  try {
    const eventDetail = {
      matchId,
      finalScore: matchData.goals || { home: 0, away: 0 },
      fixture: matchData.fixture,
      timestamp: new Date().toISOString()
    };

    const params = {
      Entries: [{
        Source: 'fixturecast.match-checker',
        DetailType: 'Match Finished',
        Detail: JSON.stringify(eventDetail),
        EventBusName: process.env.EVENT_BUS_NAME || 'default'
      }]
    };

    await eventbridge.putEvents(params).promise();
    console.log(`Triggered prediction validation for match ${matchId}`);
    
  } catch (error) {
    console.error('Error triggering prediction validation:', error);
  }
}

/**
 * Schedule more frequent updates for live matches
 */
async function scheduleLiveMatchUpdates(liveMatches) {
  // This would create temporary high-frequency schedules for live matches
  console.log(`${liveMatches.length} live matches detected - consider scheduling frequent updates`);
  // Implementation depends on your EventBridge Scheduler setup
}

/**
 * Store execution result for monitoring
 */
async function storeExecutionResult(result) {
  try {
    const params = {
      TableName: process.env.EXECUTION_LOG_TABLE,
      Item: {
        id: `match_check_${Date.now()}`,
        executionType: 'match_check',
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
      return;
    }

    const message = {
      service: 'FixtureCast Match Check',
      timestamp: executionResult.timestamp,
      severity: executionResult.errors > 0 ? 'HIGH' : 'LOW',
      summary: `Match check completed with ${executionResult.errors} errors out of ${executionResult.checkedMatches} matches checked`,
      details: executionResult
    };

    const params = {
      TopicArn: process.env.ERROR_ALERT_TOPIC_ARN,
      Message: JSON.stringify(message, null, 2),
      Subject: `FixtureCast Alert: Match Check ${executionResult.errors > 0 ? 'Errors' : 'Completed'}`
    };

    await sns.publish(params).promise();
    
  } catch (error) {
    console.error('Error sending alert:', error);
  }
}