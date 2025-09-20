/**
 * Cloudflare Pages Function for Error Tracking
 * Collects, processes, and stores error reports
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Validate request method
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // Parse request body
    const body = await request.json();
    const { errors, timestamp } = body;

    if (!errors || !Array.isArray(errors)) {
      return new Response(JSON.stringify({
        error: 'Invalid request body'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // Process each error report
    const processedErrors = [];
    const storage = env.ERRORS_KV;

    for (const error of errors) {
      try {
        // Validate error structure
        if (!error.id || !error.message || !error.timestamp) {
          console.warn('Invalid error structure:', error);
          continue;
        }

        // Enhance error with server-side information
        const enhancedError = {
          ...error,
          serverTimestamp: Date.now(),
          clientIp: getClientIP(request),
          origin: request.headers.get('origin'),
          referer: request.headers.get('referer'),
          processed: true,
        };

        // Store in KV with TTL (30 days)
        const errorKey = `error:${error.id}`;
        await storage.put(errorKey, JSON.stringify(enhancedError), {
          expirationTtl: 30 * 24 * 60 * 60, // 30 days
        });

        // Store in daily summary
        const dateKey = new Date(error.timestamp).toISOString().split('T')[0];
        const summaryKey = `daily:${dateKey}`;
        
        try {
          const existingSummary = await storage.get(summaryKey);
          const summary = existingSummary ? JSON.parse(existingSummary) : {
            date: dateKey,
            totalErrors: 0,
            errorsByCategory: {},
            errorsBySeverity: {},
            topErrors: {},
            firstSeen: error.timestamp,
            lastSeen: error.timestamp,
          };

          // Update summary
          summary.totalErrors++;
          summary.errorsByCategory[error.category] = (summary.errorsByCategory[error.category] || 0) + 1;
          summary.errorsBySeverity[error.severity] = (summary.errorsBySeverity[error.severity] || 0) + 1;
          summary.topErrors[error.message] = (summary.topErrors[error.message] || 0) + 1;
          summary.lastSeen = Math.max(summary.lastSeen, error.timestamp);

          await storage.put(summaryKey, JSON.stringify(summary), {
            expirationTtl: 90 * 24 * 60 * 60, // 90 days
          });
        } catch (summaryError) {
          console.warn('Failed to update daily summary:', summaryError);
        }

        // Check for critical errors and send alerts
        if (error.severity === 'critical') {
          await sendCriticalErrorAlert(enhancedError, env);
        }

        processedErrors.push({
          id: error.id,
          status: 'processed',
        });

      } catch (processingError) {
        console.error('Error processing error report:', processingError);
        processedErrors.push({
          id: error.id || 'unknown',
          status: 'failed',
          error: processingError.message,
        });
      }
    }

    // Log analytics
    try {
      await logErrorAnalytics(errors, env);
    } catch (analyticsError) {
      console.warn('Failed to log analytics:', analyticsError);
    }

    return new Response(JSON.stringify({
      success: true,
      processed: processedErrors.length,
      results: processedErrors,
      timestamp: Date.now(),
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error handling error reports:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

/**
 * Get client IP address
 */
function getClientIP(request) {
  return request.headers.get('cf-connecting-ip') ||
         request.headers.get('x-forwarded-for') ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

/**
 * Send alert for critical errors
 */
async function sendCriticalErrorAlert(error, env) {
  // In a real implementation, you would send this to:
  // - Slack webhook
  // - Email service
  // - PagerDuty
  // - Discord webhook
  
  console.error('CRITICAL ERROR ALERT:', {
    id: error.id,
    message: error.message,
    url: error.url,
    timestamp: new Date(error.timestamp).toISOString(),
    userAgent: error.userAgent,
    sessionId: error.sessionId,
  });

  // Example: Send to Slack webhook (if configured)
  if (env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `🚨 CRITICAL ERROR in FixtureCast`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Critical Error Detected*\n\n*Message:* ${error.message}\n*URL:* ${error.url}\n*Time:* ${new Date(error.timestamp).toISOString()}\n*Session:* ${error.sessionId}`,
              },
            },
          ],
        }),
      });
    } catch (slackError) {
      console.warn('Failed to send Slack alert:', slackError);
    }
  }
}

/**
 * Log analytics for error tracking
 */
async function logErrorAnalytics(errors, env) {
  const analytics = {
    totalErrors: errors.length,
    timestamp: Date.now(),
    errorsByCategory: {},
    errorsBySeverity: {},
    errorsByBrowser: {},
    errorsByPlatform: {},
  };

  errors.forEach(error => {
    // Count by category
    analytics.errorsByCategory[error.category] = 
      (analytics.errorsByCategory[error.category] || 0) + 1;

    // Count by severity
    analytics.errorsBySeverity[error.severity] = 
      (analytics.errorsBySeverity[error.severity] || 0) + 1;

    // Count by browser
    if (error.deviceInfo?.browser) {
      analytics.errorsByBrowser[error.deviceInfo.browser] = 
        (analytics.errorsByBrowser[error.deviceInfo.browser] || 0) + 1;
    }

    // Count by platform
    if (error.deviceInfo?.platform) {
      analytics.errorsByPlatform[error.deviceInfo.platform] = 
        (analytics.errorsByPlatform[error.deviceInfo.platform] || 0) + 1;
    }
  });

  // Store analytics
  const analyticsKey = `analytics:${new Date().toISOString().split('T')[0]}:${Date.now()}`;
  
  if (env.ERRORS_KV) {
    await env.ERRORS_KV.put(analyticsKey, JSON.stringify(analytics), {
      expirationTtl: 30 * 24 * 60 * 60, // 30 days
    });
  }
}

/**
 * GET endpoint for retrieving error statistics
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.split('/').pop();

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    if (path === 'stats') {
      // Return error statistics
      const today = new Date().toISOString().split('T')[0];
      const summaryKey = `daily:${today}`;
      
      const todayStats = await env.ERRORS_KV.get(summaryKey);
      const stats = todayStats ? JSON.parse(todayStats) : {
        date: today,
        totalErrors: 0,
        errorsByCategory: {},
        errorsBySeverity: {},
      };

      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    return new Response(JSON.stringify({
      service: 'FixtureCast Error Tracking',
      status: 'healthy',
      timestamp: Date.now(),
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to retrieve stats',
      message: error.message,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
}
