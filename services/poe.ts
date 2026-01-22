import { ChatMessage } from '../types';

const API_KEY = '_Z3Mx1FKsVupSDjN7BSlQ5EJG2sqwlDQ2hzQMqpaiuw';
const API_URL = 'https://api.poe.com/v1/chat/completions';

export async function sendMessageToPoe(messages: ChatMessage[], context?: string, model?: string, webSearch: boolean = true): Promise<string> {
    // Basic mapping
    const openAIMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));

    // Inject system instructions for formatting as the FIRST message
    const systemInstruction = {
        role: "system",
        content: `You are a helpful entertainment assistant. Verify info. When discussing media (movies/books), prioritize the most currently popular or recent version. Output links as inline markdown: [Title](URL). Do NOT use markdown bolding or italics. Write in plain text unless JSON is explicitly requested.${context ? `\n\nCONTEXT: ${context}` : ''}`
    };

    // We prepend it.
    const finalMessages = [systemInstruction, ...openAIMessages];

    if (webSearch && finalMessages.length > 0) {
        const lastMsg = finalMessages[finalMessages.length - 1];
        if (lastMsg.role === 'user' && !lastMsg.content.includes("--web_search true")) {
            lastMsg.content = `${lastMsg.content} --web_search true`;
        }
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'gemini-2.5-flash-lite',
                messages: finalMessages,
            })
        });

        if (!response.ok) {
            console.error('Poe API Error:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error details:', errorText);
            throw new Error(`Failed to send message: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response';
    } catch (error) {
        console.error('Error sending message to Poe:', error);
        return 'Sorry, I encountered an error. Please try again.';
    }
}
