/**
 * Google Gemini API Client
 * 
 * Usage:
 *   const gemini = new GeminiClient('YOUR_API_KEY');
 *   gemini.generateContent('Hello, how are you?')
 *     .then(response => console.log(response))
 *     .catch(error => console.error(error));
 */

class GeminiClient {
    constructor(apiKey, modelName = 'gemini-2.5-flash') {
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    }

    /**
     * Generate content using Gemini API
     * @param {string} prompt - The prompt to send to Gemini
     * @param {Object} options - Additional options (temperature, maxTokens, etc.)
     * @returns {Promise<string>} - The generated text response
     */
    async generateContent(prompt, options = {}) {
        const {
            temperature = 0.7,
            maxOutputTokens = 1024,
            topP = 0.8,
            topK = 40
        } = options;

        const url = `${this.baseUrl}/models/${this.modelName}:generateContent?key=${this.apiKey}`;
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: maxOutputTokens,
                topP: topP,
                topK: topK
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Unexpected response format from Gemini API');
            }
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            throw error;
        }
    }

    /**
     * Generate content with streaming support
     * @param {string} prompt - The prompt to send to Gemini
     * @param {Function} onChunk - Callback function called with each chunk of text
     * @param {Object} options - Additional options
     * @returns {Promise<string>} - The complete generated text
     */
    async generateContentStream(prompt, onChunk, options = {}) {
        const {
            temperature = 0.7,
            maxOutputTokens = 1024,
            topP = 0.8,
            topK = 40
        } = options;

        const url = `${this.baseUrl}/models/${this.modelName}:streamGenerateContent?key=${this.apiKey}`;
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: maxOutputTokens,
                topP: topP,
                topK: topK
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                                const text = data.candidates[0].content.parts[0].text;
                                fullText += text;
                                if (onChunk) {
                                    onChunk(text);
                                }
                            }
                        } catch (e) {
                            // Skip invalid JSON lines
                        }
                    }
                }
            }

            return fullText;
        } catch (error) {
            console.error('Error calling Gemini API (streaming):', error);
            throw error;
        }
    }

    /**
     * Set a new API key
     * @param {string} apiKey - The new API key
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Set the model name
     * @param {string} modelName - The model name (e.g., 'gemini-pro', 'gemini-pro-vision')
     */
    setModel(modelName) {
        this.modelName = modelName;
    }
}

class TripPlannerAgent extends GeminiClient {
    constructor(apiKey) {
        super(apiKey);
    }

    /**
     * Generate a trip plan based on details
     * @param {Object} details - Trip details
     * @returns {Promise<string>} - The generated itinerary
     */
    async generateItinerary(details) {
        const { arriveDate, departureDate, numPeople, selectedTours, preferences } = details;
        const tourTypesText = selectedTours.map(tour => tour.charAt(0).toUpperCase() + tour.slice(1) + ' Tour').join(', ');
        
        const systemInstruction = `You are a trip planner agent. You are given 3 things, data of event and weather, hotel preference, people of visit and a website to return data, use these data to plan a trip with a time table and routes.You are reminded to return a json file with each event with one line in the file.Return the file to the website after you planned`;

        const prompt = `${systemInstruction}

Create a detailed trip plan for Hong Kong with the following details:
- Arrival Date: ${arriveDate}
- Departure Date: ${departureDate}
- Number of People: ${numPeople}
- Tour Types: ${tourTypesText}
${preferences ? `- Additional Preferences: ${preferences}` : ''}

Please provide a comprehensive day-by-day itinerary with:
1. Daily schedule with times
2. Recommended activities and attractions
3. Restaurant suggestions
4. Transportation tips
5. Budget considerations
6. Any special notes or tips

Format the response in a clear, organized manner with headings and bullet points.`;

        return this.generateContent(prompt, {
            temperature: 0.7,
            maxOutputTokens: 2048
        });
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GeminiClient, TripPlannerAgent };
}

