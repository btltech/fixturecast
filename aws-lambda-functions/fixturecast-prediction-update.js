/**
 * AWS Lambda Function: fixturecast-prediction-update
 * This function is triggered by EventBridge every 6 hours
 * It calls your FixtureCast app to update predictions
 */

export const handler = async (event) => {
    console.log('🔄 EventBridge triggered prediction update at:', new Date().toISOString());
    
    try {
        // Your FixtureCast domain
        const domain = 'fixturecast.com';
        
        // API key for security - matches LAMBDA_API_KEY in your app
        const apiKey = process.env.LAMBDA_API_KEY || 'fixturecast-lambda-secure-2024-key';
        
        // Build the API URL
        const apiUrl = `https://${domain}/api/update-predictions`;
        
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
                source: 'eventbridge-prediction-scheduler',
                timestamp: new Date().toISOString(),
                trigger: 'scheduled-update',
                type: 'predictions'
            })
        });
        
        // Check if the API call was successful
        if (response.ok) {
            const responseData = await response.json();
            console.log('✅ Prediction update successful:', responseData);
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Prediction update completed successfully',
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
        console.error('💥 Error in prediction update:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Return error response
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: 'Prediction update failed',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};