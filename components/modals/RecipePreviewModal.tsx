import React, { useState } from 'react';
import { Recipe } from '../../types';

interface RecipePreviewModalProps {
    recipe: Recipe;
    isOpen: boolean;
    onSave: (recipe: Recipe) => void;
    onCancel: () => void;
}

const RecipePreviewModal: React.FC<RecipePreviewModalProps> = ({ recipe, isOpen, onSave, onCancel }) => {
    const [name, setName] = useState(recipe.name);
    const [ingredients, setIngredients] = useState(recipe.ingredients.join('\n'));
    // Handle detailed instructions properly
    const [instructions, setInstructions] = useState(recipe.instructions);
    const [imageUrl, setImageUrl] = useState(recipe.imageUrl || '');

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({
            ...recipe,
            name,
            ingredients: ingredients.split('\n').filter(i => i.trim()),
            instructions,
            imageUrl: imageUrl.trim() || undefined
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onCancel}>
            <div className="bg-white dark:bg-slate-900 shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-slate-700">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Revisa la Recepta Extreta</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Pots editar la informació abans de guardar-la.</p>
                </div>

                <div className="p-6 overflow-y-auto space-y-4 flex-grow">
                    {imageUrl && (
                        <div className="mb-4">
                            <img src={imageUrl} alt="Vista prèvia" className="w-full h-48 object-cover rounded-md" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                    )}



                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Títol</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 "
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Ingredients (un per línia)</label>
                        <textarea
                            value={ingredients}
                            onChange={(e) => setIngredients(e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Instruccions</label>
                        <textarea
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            rows={8}
                            className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        />
                    </div>
                </div>

                <div className="p-6 border-t dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel·la
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Guarda la Recepta
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecipePreviewModal;
