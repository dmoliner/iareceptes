import { GoogleGenAI, Chat, Part, Content, GenerateContentResponse } from "@google/genai";
import { Config, MessageSource, Recipe } from '../types';

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


// Funció per cercar receptes al backend
const searchBackendRecipes = async (query: string): Promise<Recipe[]> => {
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
        throw e; // Re-throw to handle it in sendMessage
    }
};

export const sendMessage = async (
    message: string,
    config: Config,
    onStream: (chunk: string, sources?: MessageSource[]) => void
): Promise<void> => {
    try {
        // --- MODE DESCONNECTAT: NOMÉS CERCA A DB ---
        // ************************************************************************************************
        // [CRITICAL POINT] IDENTIFICACIÓ DE RECEPTES DE LA BASE DE DADES
        // Aquesta secció és CLAU. El chatbot funciona en mode determinista ("Dumb Mode").
        // 1. Cerca directament a PostgreSQL usant `searchBackendRecipes`.
        // 2. Si no troba res, bloqueja la resposta i mostra disculpes.
        // 3. Si troba receptes, construeix manualment l'HTML (acordeons) sense passar per l'LLM.
        // Això garanteix 0% d'al·lucinacions i que només es mostrin dades reals.
        // ************************************************************************************************
        let relevantRecipes: Recipe[] = [];

        try {
            relevantRecipes = await searchBackendRecipes(message);
        } catch (dbError) {
            onStream("⚠️ **Error de connexió:** No he pogut connectar amb la base de dades. Si us plau, assegura't que el servidor backend (Python) està en marxa.");
            return;
        }

        if (relevantRecipes.length === 0) {
            const apology = "Ho sento, no he trobat cap recepta a la meva base de dades que coincideixi amb el que busques. Només puc oferir informació sobre les receptes que tinc guardades localment.";
            onStream(apology);
            return;
        }

        // Simulem una resposta "inteligente" però totalment determinista construïda per codi
        let response = `He trobat ${relevantRecipes.length} receptes a la teva base de dades:\n\n`;

        response += relevantRecipes.map(r => {
            let imgHtml = "";
            let ingredientsHtml = "";
            let instructionsHtml = "";

            if (r.imageUrl) {
                imgHtml = `<img src="${r.imageUrl}" width="150" style="border-radius: 8px; margin-top: 5px; margin-bottom: 10px;" alt="${r.name}"/>`;
            }

            if (r.ingredients && r.ingredients.length > 0) {
                ingredientsHtml = `<p><strong>Ingredients:</strong></p><ul>${r.ingredients.map(i => `<li>${i}</li>`).join('')}</ul>`;
            }

            if (r.instructions) {
                // Convert newlines to breaks for HTML display
                instructionsHtml = `<p><strong>Instruccions:</strong></p><p>${r.instructions.replace(/\n/g, '<br/>')}</p>`;
            }

            return `
<details style="margin-bottom: 10px; border: 1px solid #ccc; padding: 10px; border-radius: 8px;">
    <summary style="cursor: pointer; font-weight: bold; color: #dc2626; list-style: none;">
        <span style="font-size: 1.1em;">▶ ${r.name}</span>
    </summary>
    <div style="margin-top: 10px; padding-left: 10px;">
        ${imgHtml}
        ${ingredientsHtml}
        ${instructionsHtml}
        ${r.sourceUrl ? `<p><a href="${r.sourceUrl}" target="_blank" style="color: blue; text-decoration: underline;">Veure recepta original</a></p>` : ''}
    </div>
</details>`;
        }).join('\n');

        onStream(response);

    } catch (error) {
        console.error("Error in dumb mode:", error);
        onStream(`Error intern.`);
    }
};
