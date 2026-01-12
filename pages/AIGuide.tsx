import React, { useState, useEffect, useRef } from 'react';
import { getRecommendations, initGemini } from '../services/geminiService';
import { MediaItem, AIChatMessage } from '../types';
import { Send, Sparkles, Bot, User, Film } from 'lucide-react';

interface AIGuideProps {
    onItemClick: (item: MediaItem) => void;
}

const AIGuide: React.FC<AIGuideProps> = ({ onItemClick }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AIChatMessage[]>([
      { id: 'init', role: 'model', text: "Hello! I'm your cinematic guide. Tell me what you're in the mood for, or mention some movies you love, and I'll find your next stream." }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  useEffect(() => {
    // Check if API Key is available in env. If not, we might need a prompt (simplified for this demo)
    if (!process.env.API_KEY) {
       // In a real app we'd prompt. Here we assume it might be missing if not running in a specific env.
       // However, we will try to proceed as initGemini handles the check.
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: AIChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
        const response = await getRecommendations(userMsg.text);
        const aiMsg: AIChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: response.text,
            recommendations: response.recommendations
        };
        setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I'm having trouble connecting to the server. Please check your API configuration." }]);
    } finally {
        setLoading(false);
    }
  };

  // Resolve API key missing
  if (apiKeyMissing) {
      return <div className="p-10 text-center text-white">API Key Required for AI Features.</div>
  }

  return (
    <div className="flex flex-col h-screen md:pl-24 bg-[#050505]">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg">
                <Sparkles size={20} className="text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-white">AI Guide</h1>
                <p className="text-xs text-gray-400">Powered by Gemini</p>
            </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-gray-700' : 'bg-indigo-600'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`max-w-[85%] md:max-w-[70%] space-y-3`}>
                    <div className={`p-4 rounded-2xl text-sm md:text-base leading-relaxed ${
                        msg.role === 'user' 
                        ? 'bg-gray-800 text-white rounded-tr-sm' 
                        : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm'
                    }`}>
                        {msg.text}
                    </div>

                    {/* Recommendations Cards */}
                    {msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 mt-3">
                            {msg.recommendations.map((rec, idx) => (
                                <div key={idx} className="flex bg-black/40 border border-white/10 rounded-xl overflow-hidden hover:bg-white/5 transition-colors cursor-pointer group"
                                     onClick={() => {
                                         // In a real scenario, we'd fetch the real ID. 
                                         // For now, let's just trigger a search or mock click
                                         alert(`Searching for: ${rec.title}`);
                                     }}
                                >
                                    <div className="w-16 bg-gray-800 flex items-center justify-center text-gray-500">
                                        <Film size={20} />
                                    </div>
                                    <div className="p-3 flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-indigo-300 group-hover:text-indigo-200">{rec.title}</h4>
                                            <span className="text-[10px] uppercase tracking-wider text-gray-500 border border-white/10 px-1 rounded">{rec.media_type}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{rec.overview}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        ))}
        {loading && (
             <div className="flex gap-4">
                 <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                    <Bot size={16} />
                 </div>
                 <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-sm flex gap-2 items-center">
                     <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                     <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                     <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                 </div>
             </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-[#050505] sticky bottom-[72px] md:bottom-0">
          <div className="relative max-w-4xl mx-auto">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask for a recommendation..."
                className="w-full bg-gray-900/40 backdrop-blur-sm border border-white/10 rounded-full py-4 pl-6 pr-14 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button 
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="absolute right-2 top-2 p-2 bg-indigo-600 rounded-full text-white hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
            >
                <Send size={20} />
            </button>
          </div>
      </div>
    </div>
  );
};

export default AIGuide;