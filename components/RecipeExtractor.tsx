import React, { useState } from 'react';
import { Config, Recipe } from '../types';
import { extractRecipeFromUrl } from '../services/recipeService';
import CategoryBrowserModal from './modals/CategoryBrowserModal';
import RecipePreviewModal from './modals/RecipePreviewModal';

interface RecipeExtractorProps {
    config: Config;
    onRecipeAdded: (recipe: Recipe) => void;
}

const RecipeExtractor: React.FC<RecipeExtractorProps> = ({ config, onRecipeAdded }) => {
    const [extractionUrl, setExtractionUrl] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionError, setExtractionError] = useState<string | null>(null);
    const [previewRecipe, setPreviewRecipe] = useState<Recipe | null>(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showBrowserModal, setShowBrowserModal] = useState(false);

    const handleExtractRecipe = async () => {
        if (!extractionUrl) return;

        setIsExtracting(true);
        setExtractionError(null);

        try {
            const recipe = await extractRecipeFromUrl(extractionUrl, config);
            setPreviewRecipe(recipe);
            setShowPreviewModal(true);
        } catch (error) {
            console.error("Extraction error:", error);
            setExtractionError(error instanceof Error ? error.message : "Error desconegut durant l'extracció");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleSavePreview = (recipe: Recipe) => {
        // Trigger the callback to add the recipe
        onRecipeAdded(recipe);

        // Reset state
        setExtractionUrl('');
        setPreviewRecipe(null);
        setShowPreviewModal(false);
    };

    const handleRecipeSelected = (url: string) => {
        setExtractionUrl(url);
        setShowBrowserModal(false);
    };

    const handleBulkExtract = async (urls: string[]) => {
        setShowBrowserModal(false);
        setIsExtracting(true);
        setExtractionError(null);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            setExtractionUrl(url); // Show current URL being processed
            try {
                const recipe = await extractRecipeFromUrl(url, config);
                onRecipeAdded(recipe);
                successCount++;
            } catch (error) {
                console.error(`Error extracting ${url}:`, error);
                failCount++;
            }
            // Add a small delay to be nice to the server/local backend
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        setIsExtracting(false);
        setExtractionUrl('');
        alert(`Extracció completada!\n- Èxits: ${successCount}\n- Errors: ${failCount}`);
    };

    return (
        <div className="border-t dark:border-slate-700 pt-6">
            <h4 className="font-semibold mb-2">Extracció de Receptes Web</h4>
            <p className="text-sm text-slate-500 mb-4">Introdueix la URL d'una recepta (ex: kilometre0.cat) per extreure-la automàticament.</p>
            <div className="flex gap-2">
                <input
                    type="url"
                    placeholder="https://www.kilometre0.cat/receptes/..."
                    className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    value={extractionUrl}
                    onChange={(e) => setExtractionUrl(e.target.value)}
                    disabled={isExtracting}
                />
                <button
                    onClick={() => setShowBrowserModal(true)}
                    className="px-3 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 whitespace-nowrap text-sm font-medium transition-colors"
                >
                    🔍 Navegar
                </button>
                <button
                    onClick={handleExtractRecipe}
                    disabled={isExtracting || !extractionUrl}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed whitespace-nowrap text-sm font-medium transition-colors"
                >
                    {isExtracting ? 'Extraient...' : 'Extreure'}
                </button>
            </div>
            {extractionError && <p className="text-red-500 text-sm mt-2">{extractionError}</p>}

            <CategoryBrowserModal
                isOpen={showBrowserModal}
                onClose={() => setShowBrowserModal(false)}
                onRecipeSelected={handleRecipeSelected}
                onBulkExtract={handleBulkExtract}
            />

            {showPreviewModal && previewRecipe && (
                <RecipePreviewModal
                    recipe={previewRecipe}
                    isOpen={showPreviewModal}
                    onSave={handleSavePreview}
                    onCancel={() => { setShowPreviewModal(false); setPreviewRecipe(null); }}
                />
            )}
        </div>
    );
};

export default RecipeExtractor;
