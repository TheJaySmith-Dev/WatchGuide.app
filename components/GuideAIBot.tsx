import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Minus, MessageSquare, Loader2, ExternalLink, ChevronRight, BrainCircuit, ChevronDown } from 'lucide-react';
import { ChatMessage } from '../types';
import { sendMessageToPoe } from '../services/poe';
import { storageService } from '../services/storage';

interface ProcessedMessage {
    textParts: (string | { type: 'citation'; id: number; url: string; title: string })[];
    links: { id: number; title: string; url: string }[];
    thought?: string;
}

interface GuideAIBotProps {
    contextItem?: import('../types').MediaItem | null;
}

const processMessage = (content: string): ProcessedMessage => {
    let thought = '';
    let cleanContent = content;

    if (content.trimStart().startsWith('Thinking...') || content.includes('Type:')) {
        const lines = content.split('\n');
        const thoughtLines: string[] = [];
        const messageLines: string[] = [];
        let isThinkingBlock = true;

        for (const line of lines) {
            const trimmed = line.trim();
            if (isThinkingBlock) {
                if (trimmed.startsWith('Thinking...') || trimmed.startsWith('>') || trimmed === '' || trimmed.includes(' > ')) {
                    thoughtLines.push(line);
                } else {
                    isThinkingBlock = false;
                    messageLines.push(line);
                }
            } else {
                messageLines.push(line);
            }
        }

        if (thoughtLines.length > 0) {
            thought = thoughtLines.join('\n').trim();
            cleanContent = messageLines.join('\n').trim();
        }
    }

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const rawUrlRegex = /https?:\/\/[^\s]+/g;
    const links: { id: number; title: string; url: string }[] = [];
    let citationCount = 0;

    let processedContent = cleanContent.replace(linkRegex, (match, title, url) => {
        citationCount++;
        links.push({ id: citationCount, title, url });
        return title;
    });

    processedContent = processedContent.replace(rawUrlRegex, (url) => {
        const existing = links.find(l => l.url === url);
        if (!existing) {
            citationCount++;
            links.push({ id: citationCount, title: 'Source', url });
        }
        return '';
    });

    processedContent = processedContent.replace(/(\*\*|__|\*|_|`)/g, '');
    processedContent = processedContent.replace(/\s+/g, ' ').trim();

    return {
        textParts: [processedContent],
        links,
        thought
    };
};

const GuideAIBot: React.FC<GuideAIBotProps> = ({ contextItem }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activePopupIndex, setActivePopupIndex] = useState<number | null>(null);
    const [expandedThoughts, setExpandedThoughts] = useState<Set<number>>(new Set());

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    const toggleChat = () => setIsOpen(!isOpen);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activePopupIndex, expandedThoughts]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setActivePopupIndex(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        setActivePopupIndex(null);
        const userMessage: ChatMessage = {
            role: 'user',
            content: inputValue,
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const likedItems = storageService.getList('liked');
            const likedContext = likedItems.length > 0
                ? `\n\nUser's Liked Movies/Shows (for algorithm): ${likedItems.map(i => i.title || i.name).join(', ')}`
                : '';

            const contextString = contextItem
                ? `Current Item Context: ${contextItem.title || contextItem.name} (${contextItem.media_type}), Overview: ${contextItem.overview.substring(0, 100)}...`
                : 'No specific item context.';

            const responseContent = await sendMessageToPoe(
                [...messages, userMessage],
                contextString + likedContext + "\n\nUse the user's Liked items to personalize recommendations. If they ask to add to list, remind them they can use the buttons in the detail view."
            );

            const displayContent = responseContent.replace(/\[ACTION: [A-Z_]+\]/g, '').trim();

            const aiMessage: ChatMessage = {
                role: 'assistant',
                content: displayContent,
                timestamp: Date.now(),
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Failed to get response:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const toggleThought = (idx: number) => {
        setExpandedThoughts(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const getHostname = (url: string) => {
        try {
            return new URL(url).hostname;
        } catch {
            return 'link';
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            {isOpen && (
                <div className="mb-4 w-[350px] sm:w-[400px] h-[550px] bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto transition-all duration-300 origin-bottom-right animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                                <Bot size={18} className="text-white" />
                            </div>
                            <h3 className="font-medium text-white">GuideAI</h3>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={toggleChat}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                            >
                                <Minus size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-white/40 space-y-3 px-6">
                                <Bot size={48} className="text-white/20" />
                                <p className="text-sm">Hi! I'm GuideAI. I've analyzed your liked titles to provide personalized suggestions. Ask me anything!</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => {
                                const { textParts, links, thought } = msg.role === 'assistant'
                                    ? processMessage(msg.content)
                                    : { textParts: [msg.content], links: [], thought: '' };

                                const isPopupOpen = activePopupIndex === idx;
                                const isThoughtExpanded = expandedThoughts.has(idx);

                                return (
                                    <div key={idx} className="flex flex-col w-full">
                                        {thought && (
                                            <div className="mb-3 max-w-full px-1">
                                                <button
                                                    onClick={() => toggleThought(idx)}
                                                    className="flex items-center gap-2 text-[11px] text-white/30 hover:text-white/50 transition-colors mb-1 w-full"
                                                >
                                                    <BrainCircuit size={12} className="text-indigo-500/50" />
                                                    <span className="font-medium uppercase tracking-wider">Reasoning Process</span>
                                                    <div className="h-px bg-white/5 flex-1 mx-2" />
                                                    <ChevronDown size={12} className={`transition-transform duration-200 ${isThoughtExpanded ? 'rotate-180' : ''}`} />
                                                </button>
                                                <div className={`overflow-hidden transition-all duration-300 ${isThoughtExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                                    <div className="bg-[#111] border border-white/5 rounded-lg p-3 text-[10px] text-white/50 font-mono leading-relaxed whitespace-pre-wrap shadow-inner">
                                                        {thought}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className={`relative flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            {textParts.some(p => typeof p === 'string' && p.trim()) && (
                                                <div
                                                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${msg.role === 'user'
                                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                                        : 'bg-white/10 text-gray-200 rounded-bl-none'
                                                        }`}
                                                >
                                                    {textParts.map((part, i) => (
                                                        <React.Fragment key={i}>
                                                            {typeof part === 'string' ? part : ''}
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            )}

                                            {links.length > 0 && (
                                                <div className="mt-2 text-xs">
                                                    <div
                                                        className="flex items-center gap-2 cursor-pointer group select-none"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActivePopupIndex(isPopupOpen ? null : idx);
                                                        }}
                                                    >
                                                        <span className="text-white/40 group-hover:text-white/60 transition-colors font-medium">
                                                            {links.length} sources
                                                        </span>
                                                        <div className="flex items-center -space-x-2">
                                                            {links.slice(0, 3).map((link, i) => (
                                                                <div key={i} className="w-5 h-5 rounded-full border border-[#0A0A0A] bg-white/10 overflow-hidden relative z-[3]">
                                                                    <img
                                                                        src={`https://www.google.com/s2/favicons?domain=${getHostname(link.url)}&sz=64`}
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <ChevronRight size={12} className={`text-white/40 transition-transform ${isPopupOpen ? 'rotate-90' : ''}`} />
                                                    </div>

                                                    {isPopupOpen && (
                                                        <div
                                                            ref={popupRef}
                                                            className="absolute left-0 top-full mt-2 w-64 bg-[#151515] border border-white/10 rounded-xl shadow-2xl p-2 z-[60] flex flex-col gap-1"
                                                            style={{ animation: 'slideDown 0.2s ease-out' }}
                                                        >
                                                            <div className="text-[10px] uppercase tracking-wider text-white/30 px-2 py-1 font-semibold">
                                                                Sources
                                                            </div>
                                                            {links.map((link, i) => (
                                                                <a
                                                                    key={i}
                                                                    href={link.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors group"
                                                                >
                                                                    <img
                                                                        src={`https://www.google.com/s2/favicons?domain=${getHostname(link.url)}&sz=64`}
                                                                        className="w-4 h-4 rounded-sm object-contain opacity-70 group-hover:opacity-100"
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-white/90 truncate font-medium">{link.title}</div>
                                                                        <div className="text-white/40 truncate text-[10px]">{getHostname(link.url)}</div>
                                                                    </div>
                                                                    <ExternalLink size={12} className="text-white/20 group-hover:text-white/60" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white/10 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-md">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask something..."
                                className="w-full bg-white/5 text-white placeholder-white/30 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 border border-white/5 transition-all"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                className="absolute right-2 p-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg transition-all"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={toggleChat}
                className={`group pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-300 ${isOpen
                    ? 'bg-[#1a1a1a] text-white border border-white/10'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    }`}
            >
                {isOpen ? (
                    <>
                        <X size={20} />
                        <span className="font-medium pr-1">Close</span>
                    </>
                ) : (
                    <>
                        <MessageSquare size={20} />
                        <span className="font-medium pr-1">GuideAI</span>
                    </>
                )}
            </button>
        </div>
    );
};

export default GuideAIBot;
