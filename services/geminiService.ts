import { GoogleGenAI, Chat, Part, Content, GenerateContentResponse } from "@google/genai";
import { Config, MessageSource, Recipe, Message } from '../types';

let ai: GoogleGenAI | null = null;
let chat: Chat | null = null;

const getAI = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

// Funció simplificada per crear una instància de xat amb una configuració específica
// (Mantepm la signatura per no trencar imports, però ja no s'usa)
// Funció simplificada per crear una instància de xat amb una configuració específica
// (Mantepm la signatura per no trencar imports, però ja no s'usa)
export const createChatInstance = (config: Config, systemInstruction: string, useSearch: boolean): Chat => {
    // Dummy return or error
    throw new Error("LLM is disconnected.");
}

const getFinalSystemInstruction = (baseInstruction: string, offTopicResponse: string): string => {
    if (offTopicResponse) {
        return baseInstruction + `\n\n--- REGLA FORA DE TEMA ---\nIMPORTANT: Si l'usuari pregunta sobre un tema no relacionat amb la cuina, receptes, menjar saludable o tècniques culinàries, has de respondre ÚNICAMENT amb el text següent: "${offTopicResponse}"`;
    }
    return baseInstruction;
}


const searchBackendRecipes = async (query: string): Promise<Recipe[]> => {
    // Legacy function, might be removed if handled entirely by backend chat endpoint,
    // but kept just in case we need explicit search elsewhere.
    try {
        const res = await fetch(`/api/recipes/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) {
            throw new Error(`Backend responded with status ${res.status}`);
        }
        const data = await res.json();
        return data.map((r: any) => ({
            id: r.id,
            name: r.name,
            ingredients: Array.isArray(r.ingredients) ? r.ingredients : (JSON.parse(r.ingredients || '[]')),
            instructions: r.instructions,
            imageUrl: r.image_url,
            sourceUrl: r.source_url
        }));
    } catch (e) {
        console.error("Error searching backend recipes:", e);
        throw e;
    }
};

export const sendMessage = async (
    message: string,
    history: Message[],
    config: Config,
    onStream: (chunk: string, sources?: MessageSource[]) => void
): Promise<void> => {
    try {
        const payload = {
            message: message,
            history: history.map(m => ({
                sender: m.sender,
                text: m.text
            }))
        };

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        onStream(data.text);

    } catch (error) {
        console.error("Error in AI chat:", error);
        onStream("Ho sento, hi ha hagut un error comunicant-se amb el xef.");
    }
};

export const clearHistory = () => {
    // No-op now as history is managed by React state
};
