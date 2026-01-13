import { MediaItem } from "../types";

// Service neutralized per user request
export const initGemini = (apiKey: string) => {
  console.log("Gemini service disabled");
};

export const getRecommendations = async (userMessage: string): Promise<{ text: string, recommendations: MediaItem[] }> => {
  return {
    text: "AI features are currently disabled.",
    recommendations: []
  };
};