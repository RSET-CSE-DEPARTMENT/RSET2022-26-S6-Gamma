// Sentiment Analysis using Google Cloud Natural Language API
const SENTIMENT_API_KEY = 'YOUR_GOOGLE_CLOUD_API_KEY'; // Replace with your actual API key

async function analyzeSentiment(text) {
    try {
        const response = await fetch(`https://language.googleapis.com/v1/documents:analyzeSentiment?key=${SENTIMENT_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                document: {
                    type: 'PLAIN_TEXT',
                    content: text
                },
                encodingType: 'UTF8'
            })
        });
        
        const data = await response.json();
        return {
            score: data.documentSentiment.score,
            magnitude: data.documentSentiment.magnitude
        };
    } catch (error) {
        console.error('Error analyzing sentiment:', error);
        return null;
    }
}

// Alternative: Using a simpler sentiment analysis approach
function simpleSentimentAnalysis(text) {
    const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'good', 'best', 'love', 'enjoyed', 'fantastic', 'brilliant'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'disappointing', 'poor', 'worst', 'boring', 'waste', 'unfortunately'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
        if (positiveWords.includes(word)) score++;
        if (negativeWords.includes(word)) score--;
    });
    
    // Normalize score to range -1 to 1
    const normalizedScore = Math.max(-1, Math.min(1, score / 5));
    
    return {
        score: normalizedScore,
        magnitude: Math.abs(normalizedScore)
    };
}

// Function to get sentiment label
function getSentimentLabel(score) {
    if (score > 0.2) return 'Positive';
    if (score < -0.2) return 'Negative';
    return 'Neutral';
}

// Function to get sentiment class
function getSentimentClass(score) {
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
}

// Export functions
window.sentimentAnalysis = {
    analyzeSentiment,
    simpleSentimentAnalysis,
    getSentimentLabel,
    getSentimentClass
}; 