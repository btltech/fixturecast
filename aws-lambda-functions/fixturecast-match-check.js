/**
 * AWS Lambda Function: fixturecast-match-check
 * This function is triggered by EventBridge every 1 hour
 * It calls your FixtureCast app to check and update match results
 */

export const handler = async (event) => {
    console.log('⚽ EventBridge triggered match check at:', new Date().toISOString());
    
    try {
        // Your FixtureCast domain
        const domain = 'fixturecast.com';
        
        // API key for security - you'll set this in Lambda environment variables
        const apiKey = process.env.FIXTURECAST_API_KEY || 'temp-dev-key-12345';
        
        // Build the API URL
        const apiUrl = `https://${domain}/api/update-results`;
        
        console.log('📡 Calling FixtureCast API:', apiUrl);
        
        // Make the API call to your FixtureCast app
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'User-Agent': 'FixtureCast-Lambda-Scheduler/1.0'
            },
            body: JSON.stringify({
                source: 'eventbridge-match-scheduler',
                timestamp: new Date().toISOString(),
                trigger: 'scheduled-check',
                type: 'match-results',
                checkLiveMatches: true
            })
        });
        
        // Check if the API call was successful
        if (response.ok) {
            const responseData = await response.json();
            console.log('✅ Match check successful:', responseData);
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Match check completed successfully',
                    timestamp: new Date().toISOString(),
                    apiResponse: responseData
                })
            };
        } else {
            // API call failed
            const errorText = await response.text();
            console.error('❌ API call failed:', response.status, errorText);
            
            throw new Error(`API call failed with status ${response.status}: ${errorText}`);
        }
        
    } catch (error) {
        console.error('💥 Error in match check:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Return error response
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: 'Match check failed',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};