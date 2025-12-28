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
        <div className="w-full h-screen flex flex-col items-center bg-slate-100 dark:bg-gray-900 p-4">
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 shadow-lg p-4 sm:p-6 w-full max-w-3xl flex flex-col h-full rounded-2xl">
                <header className="flex justify-between items-center mb-4 border-b pb-4 dark:border-slate-700">
                    <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">ChefBot</h1>
                    <button onClick={onShowAdmin} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Obre la configuració">
                        <i className="fa-solid fa-gear w-6 h-6 text-slate-500 dark:text-slate-400"></i>
                    </button>
                </header>
                <main ref={messagesContainerRef} className="flex-grow overflow-y-auto mb-4 pr-2 space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className="max-w-md">
                                <div className={`p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-slate-800 dark:bg-slate-200 text-slate-50 dark:text-slate-900 rounded-br-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md'}`}>
                                    {renderMessageContent(msg)}
                                </div>
                                {msg.sources && msg.sources.length > 0 && (
                                     <div className="text-xs text-slate-500 mt-2 pl-2">
                                        <span className="font-semibold">Fonts:</span>
                                        <ul className="list-disc list-inside">
                                            {msg.sources.map((source, index) => (
                                                <li key={index}>
                                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:underline text-slate-600 dark:text-slate-400">
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
                         <div className="flex justify-start">
                             <div className="max-w-md p-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-bl-md">
                                 <div className="flex items-center space-x-2 text-sm italic text-slate-500 dark:text-slate-400">
                                     <i className="fa-solid fa-spinner fa-spin-pulse"></i>
                                     <span>{loadingText}</span>
                                 </div>
                             </div>
                         </div>
                    )}
                </main>
                <footer className="flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <textarea 
                            id="chat-input" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Escriu la teva pregunta..." 
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow resize-none rounded-xl" 
                            rows={1}
                            aria-label="Entrada de text del xat"
                        />
                        <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-3 bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 transition-colors disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed rounded-full" aria-label="Envia el missatge">
                            <i className="fa-solid fa-paper-plane w-5 h-5"></i>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ChatView;