import { Config, Recipe } from '../types';
import { createChatInstance } from './geminiService';

export const extractRecipeFromUrl = async (url: string, config: Config): Promise<Recipe> => {
    try {
        const response = await fetch('http://localhost:5000/api/extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error del servidor: ${response.statusText}`);
        }

        const recipe = await response.json();

        // Ensure the ID is unique for the frontend
        return {
            ...recipe,
            id: recipe.id || crypto.randomUUID()
        };
    } catch (error) {
        console.error("Error extracting recipe:", error);
        throw new Error(error instanceof Error ? error.message : "No s'ha pogut connectar amb el servidor d'extracció.");
    }
};

export interface ScannedItem {
    title: string;
    url: string;
    type?: 'category' | 'recipe';
}

export const scanRootCategories = async (url: string = 'https://www.kilometre0.cat/'): Promise<ScannedItem[]> => {
    const response = await fetch('http://localhost:5000/api/scan-root', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
    });
    if (!response.ok) throw new Error("Error scanning categories");
    return response.json();
};

export const scanRecipesFromUrl = async (url: string): Promise<ScannedItem[]> => {
    const response = await fetch('http://localhost:5000/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
    });
    if (!response.ok) throw new Error("Error scanning recipes");
    return response.json();
};
