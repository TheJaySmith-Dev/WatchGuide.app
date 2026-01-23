import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown, ExternalLink, Loader2, ArrowLeft } from 'lucide-react';
import { ChatMessage, MediaItem } from '../types';
import { sendMessageToPoe } from '../services/poe';
import { storageService } from '../services/storage';
import ChronIntro from '../components/ChronIntro';
import YouTube from 'react-youtube';
import { searchMulti, getVideos } from '../services/api';

interface ProcessedMessage {
    textParts: (string | { type: 'citation'; id: number; url: string; title: string })[];
    links: { id: number; title: string; url: string }[];
}

const processMessage = (content: string): ProcessedMessage => {
    let cleanContent = content;

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const rawUrlRegex = /https?:\/\/[^\s]+/g;
    const links: { id: number; title: string; url: string }[] = [];
    let citationCount = 0;

    let processedContent = cleanContent.replace(linkRegex, (_, title, url) => {
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
        links
    };
};

interface GuideAIPageProps {
    onBack: () => void;
}

const GuideAIPage: React.FC<GuideAIPageProps> = ({ onBack }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [model, setModel] = useState<string>(() => {
        const saved = localStorage.getItem('guideai_model') || 'gemini-2.5-flash-lite';
        if (saved === 'grok-4-fast-reasoning' || saved === 'grok-4.1-fast-reasoning') {
            return 'gpt-4o-mini-search';
        }
        if (saved === 'auto') {
            return 'gemini-2.5-flash-lite';
        }
        return saved;
    });
    const [webSearch, setWebSearch] = useState<boolean>(() => {
        const saved = localStorage.getItem('guideai_web_search');
        if (saved === 'false') return false;
        return true;
    });
    const [activePopupIndex, setActivePopupIndex] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    // Removed suggestions UI
    const [trailerMessages, setTrailerMessages] = useState<Record<number, { key: string; title: string }>>({});

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activePopupIndex]);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
            }
                setActivePopupIndex(null);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    // Removed likes-based recommendations fetch

    // Removed auto model selection helper
    // Removed assistant parsing for suggestions
    const processAssistant = async (_text: string) => {};

    const wantsTrailer = (query: string) => {
        const q = query.toLowerCase();
        return /\b(trailer|teaser|play trailer|watch trailer)\b/.test(q);
    };
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const parseTrailerQuery = (query: string): { title: string | null } => {
        const quoted = query.match(/"([^"]+)"/);
        if (quoted && quoted[1]) return { title: quoted[1].trim() };
        const p1 = query.match(/trailer\s+for\s+(.+)/i);
        if (p1 && p1[1]) return { title: p1[1].trim() };
        const p2 = query.match(/(watch|play)\s+(the\s+)?trailer\s+for\s+(.+)/i);
        if (p2 && p2[3]) return { title: p2[3].trim() };
        const p3 = query.match(/(.+)\s+trailer/i);
        if (p3 && p3[1]) return { title: p3[1].trim() };
        return { title: null };
    };
    const pickItem = (items: MediaItem[], q: string): MediaItem | undefined => {
        const nq = normalize(q);
        const exact = items.find(i => normalize(i.title || i.name || '') === nq);
        if (exact) return exact;
        const partial = items.find(i => normalize(i.title || i.name || '').includes(nq));
        if (partial) return partial;
        return items.find(r => r.media_type === 'movie' || r.media_type === 'tv');
    };
    const pickVideo = (videos: any[]) => {
        const yt = videos.filter(v => v.site === 'YouTube');
        const official = yt.find(v => (v.type || '').toLowerCase() === 'trailer' && (v.official === true || /official/i.test(v.name || '')));
        if (official) return official;
        const trailer = yt.find(v => (v.type || '').toLowerCase() === 'trailer');
        if (trailer) return trailer;
        const teaser = yt.find(v => (v.type || '').toLowerCase() === 'teaser');
        if (teaser) return teaser;
        return yt[0];
    };

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
            let trailerInfo: { key: string; title: string } | null = null;
            if (wantsTrailer(userMessage.content)) {
                const parsed = parseTrailerQuery(userMessage.content);
                const qTitle = parsed.title || userMessage.content.replace(/\b(trailer|teaser|play|watch|for|the)\b/gi, '').trim();
                const results = await searchMulti(qTitle);
                const item = pickItem(results, qTitle);
                if (item) {
                    const type = item.media_type === 'tv' ? 'tv' : 'movie';
                    const vids = await getVideos(type, item.id);
                    const best = pickVideo(vids);
                    if (best && best.key) trailerInfo = { key: best.key, title: item.title || item.name || 'Trailer' };
                }
            }
            const likedItems = await storageService.getList('liked');
            const likedContext = likedItems.length > 0
                ? `\n\nUser's Liked Movies/Shows (for algorithm): ${likedItems.map(i => i.title || i.name).join(', ')}`
                : '';

            const auto = { model, web: webSearch };
            const responseContent = await sendMessageToPoe(
                [...messages, userMessage],
                likedContext + "\n\nCRITICAL: The Simkl integration has been COMPLETELY REMOVED. THE APP NOW USES PRIVACY-FIRST LOCAL STORAGE ONLY. Do NOT mention Simkl, accounts, or logging in. If the user asks to add to a list, tell them to use the '+' (Want to Watch), 'Check' (Watched), or 'Heart' (Like) buttons in the detail view. Use the user's Liked items to personalize recommendations based on their local preferences.",
                auto.model,
                auto.web
            );

            const displayContent = responseContent.replace(/\[ACTION: [A-Z_]+\]/g, '').trim();

            const aiMessage: ChatMessage = {
                role: 'assistant',
                content: displayContent,
                timestamp: Date.now(),
            };

            setMessages(prev => {
                const next = [...prev, aiMessage];
                if (trailerInfo) {
                    setTrailerMessages(t => ({ ...t, [next.length - 1]: trailerInfo! }));
                }
                return next;
            });
            await processAssistant(displayContent);
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

    // no-op: reasoning UI removed

    const getHostname = (url: string) => {
        try {
            return new URL(url).hostname;
        } catch {
            return 'link';
        }
    };

    return (
        <div className="min-h-[100dvh] pt-24 pb-24 px-4 md:pl-32 bg-[#050505] flex flex-col max-w-5xl mx-auto h-[100dvh] relative">
            <ChronIntro />
            {/* Suggestions UI removed for cleaner chat */}
            {/* Header with Back Button */}
            <div className="absolute top-24 left-4 md:left-32 z-10">
                 <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                    <ArrowLeft size={24} />
                </button>
            </div>

            

            <div className="flex-1 overflow-y-auto space-y-6 pb-4 pt-12 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent px-2">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-white/40 space-y-4 px-6">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden mb-4 shadow-lg shadow-indigo-500/20 border border-white/10 bg-white/10 flex items-center justify-center">
                            <img
                                src="https://i.ibb.co/kVmNhyjv/Chat-GPT-Image-Jan-22-2026-at-07-40-09-PM.png"
                                alt="Chron"
                                className="w-full h-full object-cover"
                                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                            />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Chron</h2>
                        <p className="text-base max-w-md">I've analyzed your liked titles to provide personalized suggestions. Ask me anything about movies or TV shows!</p>
                        <div className="mt-4">
                            <label className="text-xs text-white/40 mr-2">Model</label>
                            <select
                                value={model}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setModel(val);
                                    localStorage.setItem('guideai_model', val);
                                }}
                                className="bg-white/10 text-white text-sm px-3 py-2 rounded-lg border border-white/10"
                            >
                                <option value="gemini-2.5-flash-lite">Gemini Flash Lite</option>
                                <option value="gpt-4o-mini-search">GPT-4o-mini-Search</option>
                            </select>
                            <>
                                <label className="text-xs text-white/40 ml-4 mr-2">Web Search</label>
                                <div
                                    className={`w-12 h-6 rounded-full border border-white/10 relative cursor-pointer ${webSearch ? 'bg-indigo-600/60' : 'bg-white/10'}`}
                                    onClick={() => {
                                        const val = !webSearch;
                                        setWebSearch(val);
                                        localStorage.setItem('guideai_web_search', val ? 'true' : 'false');
                                    }}
                                    title="Web Search"
                                >
                                    <div
                                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${webSearch ? 'translate-x-6' : 'translate-x-0'}`}
                                    />
                                </div>
                            </>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const { textParts, links } = msg.role === 'assistant'
                            ? processMessage(msg.content)
                            : { textParts: [msg.content], links: [] };

                        const isPopupOpen = activePopupIndex === idx;
                        // reasoning UI removed

                        return (
                            <div key={idx} className="flex flex-col w-full">
                                

                                <div className={`relative flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    {textParts.some(p => typeof p === 'string' && p.trim()) && (
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-5 py-3 text-base leading-relaxed whitespace-pre-wrap shadow-sm ${msg.role === 'user'
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

                                    {msg.role === 'assistant' && trailerMessages[idx] && (
                                        <div className="mt-3 w-full max-w-[85%]">
                                            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 shadow-xl">
                                                <div className="text-white font-semibold mb-2">{trailerMessages[idx].title}</div>
                                                <div className="aspect-video rounded-xl overflow-hidden">
                                                    <YouTube videoId={trailerMessages[idx].key} opts={{ playerVars: { autoplay: 0 } }} />
                                                </div>
                                            </div>
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
                                                <ChevronDown size={12} className={`text-white/40 transition-transform ${isPopupOpen ? 'rotate-180' : ''}`} />
                                            </div>

                                            {isPopupOpen && (
                                                <div
                                                    ref={popupRef}
                                                    className="absolute left-0 top-full mt-2 w-72 bg-[#151515] border border-white/10 rounded-xl shadow-2xl p-2 z-[60] flex flex-col gap-1"
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

            <div className="fixed left-0 right-0 z-[220] p-2" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
                <div className="relative flex items-center max-w-4xl mx-auto w-full px-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask something..."
                        className="w-full bg-white/5 text-white placeholder-white/30 rounded-xl pl-6 pr-14 py-4 text-base focus:outline-none focus:ring-1 focus:ring-indigo-500/50 border border-white/10 transition-all shadow-lg"
                        autoFocus
                    />
                    <div className="absolute right-16 flex items-center gap-2 hidden md:flex">
                        <select
                            value={model}
                            onChange={(e) => {
                                const val = e.target.value;
                                setModel(val);
                                localStorage.setItem('guideai_model', val);
                            }}
                            className="bg-white/10 text-white text-xs px-2 py-2 rounded-lg border border-white/10"
                            title="AI Model"
                        >
                            <option value="gemini-2.5-flash-lite">Gemini Flash Lite</option>
                            <option value="gpt-4o-mini-search">GPT-4o-mini-Search</option>
                        </select>
                        <>
                            <label className="text-white/40 text-[11px]">Web</label>
                            <div
                                className={`w-10 h-5 rounded-full border border-white/10 relative cursor-pointer ${webSearch ? 'bg-indigo-600/60' : 'bg-white/10'}`}
                                onClick={() => {
                                    const val = !webSearch;
                                    setWebSearch(val);
                                    localStorage.setItem('guideai_web_search', val ? 'true' : 'false');
                                }}
                                title="Web Search"
                            >
                                <div
                                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${webSearch ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                            </div>
                        </>
                    </div>
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        className="absolute right-3 p-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl transition-all shadow-md hover:shadow-indigo-500/20"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuideAIPage;
