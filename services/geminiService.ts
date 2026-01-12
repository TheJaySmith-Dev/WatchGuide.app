import { GoogleGenAI, Type } from "@google/genai";
import { MediaItem } from "../types";

// Note: In a production app, never expose the API key on the client.
// However, per instructions, we access it via process.env.API_KEY.
// The prompt implies we should use the user's key if available or a provided one. 
// For this generation, we assume the environment variable is injected or we guide usage.
// Since we don't have a secure backend here, we'll initialize assuming the key exists.

// IMPORTANT: For this specific demo code generation, if the environment variable 
// isn't set in the runner, this will fail. 
// I will add a fallback mechanism or handle the error gracefully in the UI.

let ai: GoogleGenAI | null = null;

export const initGemini = (apiKey: string) => {
  ai = new GoogleGenAI({ apiKey });
};

export const getRecommendations = async (userMessage: string): Promise<{ text: string, recommendations: MediaItem[] }> => {
  if (!ai) {
      if (process.env.API_KEY) {
          ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      } else {
        throw new Error("API Key missing");
      }
  }

  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are "Watch Guide AI", a sophisticated, cinematic streaming assistant.
    Your goal is to recommend movies and TV shows based on the user's mood, preferences, or vague descriptions.
    
    Rules:
    1. Focus on STREAMING availability (Netflix, Hulu, HBO, Disney+, Prime, AppleTV+).
    2. Do NOT suggest renting or buying if possible, unless it's a major blockbuster only available there.
    3. Be concise, witty, and act like a film critic with good taste.
    4. Provide a JSON array of specific recommendations at the end of your response if appropriate.
    
    If the user asks for recommendations, return a JSON object with this structure:
    {
      "responseText": "Your conversational response here...",
      "recommendations": [
        { "title": "Movie Title", "media_type": "movie" | "tv", "reason": "Short reason" }
      ]
    }
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      responseText: { type: Type.STRING },
      recommendations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            media_type: { type: Type.STRING, enum: ["movie", "tv"] },
            reason: { type: Type.STRING }
          },
          required: ["title", "media_type"]
        }
      }
    },
    required: ["responseText", "recommendations"]
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userMessage,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const parsed = JSON.parse(text);
    
    // We need to map these titles to actual data (mocking the search for now or just returning basic objects)
    // In a real app, we would search TMDB for each recommendation title to get the poster.
    // Here we will return them and let the UI try to resolve them or show a placeholder.
    
    return {
        text: parsed.responseText,
        recommendations: parsed.recommendations.map((rec: any, index: number) => ({
            id: index, // Temp ID
            title: rec.title,
            name: rec.title,
            media_type: rec.media_type,
            overview: rec.reason,
            poster_path: null, // UI will need to handle fetching or showing placeholder
            backdrop_path: null
        }))
    };

  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      text: "I'm having trouble connecting to the cinematic neural network right now. Please try again later.",
      recommendations: []
    };
  }
};
