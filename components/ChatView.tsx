import React, { useState, useRef, useEffect } from 'react';
import { Config, Message } from '../types';
import { sendMessage } from '../services/geminiService';
import { marked } from 'marked';

interface ChatViewProps {
    config: Config;
    onShowAdmin: () => void;
}

// Array de missatges de càrrega
const loadingMessages = [
    "Buscant en els meus llibres de cuina...",
    "Buscant en la meva base de dades...",
    "La resposta està fent xup-xup, ara te la passo..."
];


const ChatView: React.FC<ChatViewProps> = ({ config, onShowAdmin }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const getWelcomeMessage = (): string => {
            const hour = new Date().getHours();

            const morningMessages = [
                "Bon dia! ☀️ Puc suggerir-te una recepta per començar el dia amb energia, generar-te un menú setmanal equilibrat o donar-te consells de nutrició. Què et ve de gust?",
                "Bon dia! A punt per cuinar? Digues-me què t'agradaria preparar avui i t'ajudaré. També puc crear menús o donar-te consells de dieta saludable.",
                "Bon dia! 🍳 Què et semblaria un esmorzar especial? Demana'm una recepta, un pla de menjars per a la setmana o consells de nutrició!"
            ];

            const afternoonMessages = [
                "Bona tarda! És hora de dinar? Puc donar-te idees per a un plat deliciós, ajudar-te a planificar un menú complet o oferir-te consells per a una dieta saludable. Demana'm el que vulguis!",
                "Bona tarda! Fam? Tinc un munt de receptes esperant-te. També et puc ajudar a organitzar els teus àpats o a resoldre dubtes sobre nutrició.",
                "Bona tarda! Buscant inspiració per dinar? Explica'm què tens a la nevera i et proposo una recepta. A més, puc generar menús i donar-te consells de salut."
            ];

            const nightMessages = [
                "Bona nit! Busques un sopar lleuger i saborós? Et puc recomanar una recepta, crear un menú per demà o donar-te consells per a una dieta equilibrada. Què et preparo?",
                "Bona nit! Vols relaxar-te amb un sopar reconfortant? Estic aquí per donar-te idees. També puc planificar els teus menús o donar-te trucs de cuina saludable.",
                "Bona nit! 🌙 Encara no saps què sopar? Demana'm una recepta ràpida, un menú setmanal o consells per a una alimentació més sana."
            ];

            let selectedMessages: string[];

            if (hour < 12) {
                selectedMessages = morningMessages;
            } else if (hour < 19) {
                selectedMessages = afternoonMessages;
            } else {
                selectedMessages = nightMessages;
            }

            const randomIndex = Math.floor(Math.random() * selectedMessages.length);
            return selectedMessages[randomIndex];
        };

        const welcomeMessage: Message = {
            id: crypto.randomUUID(),
            text: getWelcomeMessage(),
            sender: 'bot'
        };

        setMessages([welcomeMessage]);
    }, []); // L'array buit assegura que només s'executi en muntar el component


    useEffect(() => {
        messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        const text = input.trim();
        if (text === '' || isLoading) return;

        const userMessage: Message = { id: crypto.randomUUID(), text, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');

        const randomIndex = Math.floor(Math.random() * loadingMessages.length);
        setLoadingText(loadingMessages[randomIndex]);
        setIsLoading(true);

        const botMessageId = crypto.randomUUID();
        setMessages(prev => [...prev, { id: botMessageId, text: '', sender: 'bot', sources: [] }]);

        try {
            await sendMessage(text, config, (chunk, sources) => {
                setMessages(prev => prev.map(msg =>
                    msg.id === botMessageId
                        ? { ...msg, text: msg.text + chunk, sources: sources || msg.sources }
                        : msg
                ));
            });
        } catch (error) {
            setMessages(prev => prev.map(msg =>
                msg.id === botMessageId
                    ? { ...msg, text: "Error en rebre la resposta de l'assistent." }
                    : msg
            ));
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const renderMessageContent = (message: Message) => {
        const unsafeHtml = marked.parse(message.text);
        return <div className="prose dark:prose-invert prose-p:before:content-none prose-p:after:content-none" dangerouslySetInnerHTML={{ __html: unsafeHtml as string }} />;
    };

    return (
        <div className="w-full h-screen flex flex-col items-center bg-gradient-to-br from-stone-50 to-rose-50 dark:from-stone-900 dark:to-fuchsia-950 p-4 transition-colors duration-500">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/20 dark:border-slate-700 shadow-2xl p-0 w-full max-w-4xl flex flex-col h-full rounded-3xl overflow-hidden relative ring-1 ring-black/5">

                {/* Header Moderno con Gradiente Berry/Chocolate */}
                <header className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-fuchsia-800 to-rose-900 shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white shadow-inner">
                            <i className="fa-solid fa-hat-chef text-xl"></i>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">ChefBot</h1>
                            <p className="text-xs text-rose-100 font-medium opacity-90">El teu assistent culinari</p>
                        </div>
                    </div>
                    <button onClick={onShowAdmin} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all flex items-center justify-center" aria-label="Configuració">
                        <i className="fa-solid fa-sliders w-5 h-5"></i>
                    </button>

                    {/* Estilos Globales para Accordions (inyectados aquí para asegurar que aplican al contenido renderizado por marked) */}
                    <style>{`
                        details {
                            background-color: rgba(255, 255, 255, 0.6);
                            border: 1px solid rgba(231, 229, 228, 0.8);
                            border-radius: 0.75rem;
                            padding: 0.75rem;
                            margin-bottom: 0.75rem;
                            transition: all 0.3s ease;
                            overflow: hidden;
                        }
                        .dark details {
                            background-color: rgba(30, 41, 59, 0.4);
                            border-color: rgba(71, 85, 105, 0.4);
                        }
                        details[open] {
                            background-color: rgba(255, 255, 255, 0.95);
                            box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.05);
                            border-color: rgba(225, 29, 72, 0.2);
                        }
                        .dark details[open] {
                            background-color: rgba(30, 41, 59, 0.9);
                            border-color: rgba(244, 114, 182, 0.2);
                        }
                        summary {
                            cursor: pointer;
                            font-weight: 700;
                            padding: 0.25rem;
                            list-style: none;
                            display: flex;
                            align-items: center;
                            color: #be185d; /* Pink-700 */
                            outline: none;
                            font-size: 1.05rem;
                        }
                        .dark summary { color: #f472b6; /* Pink-400 */ }
                        summary::-webkit-details-marker { display: none; }
                        summary::after {
                            content: '👇'; 
                            margin-left: auto;
                            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            opacity: 0.7;
                        }
                        details[open] summary::after {
                            transform: rotate(180deg);
                        }
                        /* Imágenes en accordions */
                        details img {
                            border-radius: 0.75rem;
                            margin-top: 1rem;
                            max-width: 100%;
                            border: 3px solid white;
                            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                        }
                        .dark details img {
                            border-color: #334155;
                        }
                    `}</style>
                </header>

                {/* Área de Chat con patrón de fondo sutil y tema marrón */}
                <main ref={messagesContainerRef} className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-8 scroll-smooth bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`max-w-[85%] sm:max-w-xl group relative ${msg.sender === 'user' ? 'items-end flex flex-col' : 'items-start flex flex-col'}`}>

                                {/* Etiqueta del remitente (opcional, para estilo) */}
                                <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 px-1 ${msg.sender === 'user' ? 'text-fuchsia-800 dark:text-fuchsia-400' : 'text-stone-500 dark:text-stone-400'}`}>
                                    {msg.sender === 'user' ? 'Tu' : 'ChefBot'}
                                </span>

                                <div className={`
                                    p-4 shadow-md text-sm sm:text-base leading-relaxed relative
                                    ${msg.sender === 'user'
                                        ? 'bg-gradient-to-br from-fuchsia-700 to-rose-600 text-white rounded-2xl rounded-tr-sm shadow-fuchsia-900/20'
                                        : 'bg-white/95 dark:bg-slate-800/95 text-stone-700 dark:text-stone-200 rounded-2xl rounded-tl-sm border border-stone-100 dark:border-stone-700 backdrop-blur-sm shadow-stone-200/50 dark:shadow-none'
                                    }
                                `}>
                                    {renderMessageContent(msg)}
                                </div>

                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-2 bg-white/50 dark:bg-slate-800/50 p-2 rounded-xl text-xs text-slate-500 border border-slate-100 dark:border-slate-700 backdrop-blur-sm">
                                        <div className="flex items-center gap-1 mb-1 text-orange-600 dark:text-orange-400 font-semibold">
                                            <i className="fa-solid fa-book-open"></i> Fonts:
                                        </div>
                                        <ul className="grid grid-cols-1 gap-1">
                                            {msg.sources.map((source, index) => (
                                                <li key={index} className="truncate">
                                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center gap-1">
                                                        <i className="fa-solid fa-link text-[10px] opacity-50"></i>
                                                        {source.title || new URL(source.uri).hostname}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && messages[messages.length - 1]?.sender === 'bot' && messages[messages.length - 1]?.text === '' && (
                        <div className="flex justify-start animate-pulse">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-sm shadow-sm border border-stone-100 dark:border-stone-700 flex items-center gap-3">
                                <div className="w-2 h-2 bg-fuchsia-600 rounded-full animate-bounce delay-75"></div>
                                <div className="w-2 h-2 bg-fuchsia-600 rounded-full animate-bounce delay-150"></div>
                                <div className="w-2 h-2 bg-fuchsia-600 rounded-full animate-bounce delay-300"></div>
                                <span className="text-sm font-medium text-stone-500 ml-2">{loadingText}</span>
                            </div>
                        </div>
                    )}
                </main>

                {/* Input Flotante Estilizado */}
                <footer className="p-4 sm:p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-t border-white/20 dark:border-slate-800 z-10">
                    <div className="relative group max-w-4xl mx-auto flex items-end gap-2 bg-white dark:bg-slate-800 p-2 pr-2 rounded-[2rem] shadow-xl shadow-stone-200/50 dark:shadow-none border border-stone-100 dark:border-slate-700 focus-within:border-fuchsia-200 dark:focus-within:border-fuchsia-900 focus-within:ring-4 focus-within:ring-fuchsia-50 dark:focus-within:ring-fuchsia-900/20 transition-all duration-300">
                        <textarea
                            id="chat-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Demana una recepta, ingredients o consells..."
                            className="w-full pl-6 py-3.5 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-none max-h-32 text-base scrollbar-hide"
                            rows={1}
                            style={{ minHeight: '52px' }}
                            aria-label="Escriu al xat"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className={`
                                mb-1 mr-1 p-3.5 rounded-full transition-all duration-300 flex items-center justify-center shrink-0
                                ${(!input.trim() || isLoading)
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                                    : 'bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white shadow-lg shadow-rose-200 dark:shadow-none hover:shadow-rose-300 transform hover:scale-105 active:scale-95'
                                }
                            `}
                            aria-label="Envia"
                        >
                            <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            ChefBot pot cometre errors. Verifica les receptes importants.
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ChatView;