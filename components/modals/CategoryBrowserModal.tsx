import React, { useState, useEffect } from 'react';
import { scanRootCategories, scanRecipesFromUrl, ScannedItem } from '../../services/recipeService';

interface CategoryBrowserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRecipeSelected: (url: string) => void;
    onBulkExtract: (urls: string[]) => void;
}

const CategoryBrowserModal: React.FC<CategoryBrowserModalProps> = ({ isOpen, onClose, onRecipeSelected, onBulkExtract }) => {
    const [step, setStep] = useState<'root' | 'category'>('root');
    const [items, setItems] = useState<ScannedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && step === 'root') {
            loadRootCategories();
        }
    }, [isOpen]);

    const loadRootCategories = async () => {
        setLoading(true);
        setError(null);
        try {
            const categories = await scanRootCategories();
            setItems(categories);
        } catch (e) {
            setError("No s'han pogut carregar les categories.");
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryClick = async (item: ScannedItem) => {
        if (item.type === 'category' || !item.type) { // Default to category if type undefined (legacy/root)
            setLoading(true);
            setError(null);
            setSelectedCategory(item.title);
            try {
                const results = await scanRecipesFromUrl(item.url);
                setItems(results);
                setStep('category'); // We stay in 'category' mode or conceptually 'browsing'
            } catch (e) {
                setError(`No s'han pogut carregar els continguts de ${item.title}.`);
            } finally {
                setLoading(false);
            }
        } else {
            // It is a recipe
            onRecipeSelected(item.url);
        }
    };

    const handleBack = () => {
        setStep('root');
        loadRootCategories();
        setSelectedCategory(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col rounded-lg" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        {step === 'category' && (
                            <button onClick={handleBack} className="mr-2 text-slate-500 hover:text-slate-700">
                                ←
                            </button>
                        )}
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            {step === 'root' ? 'Explorar Categories' : selectedCategory || 'Llista de Receptes'}
                        </h3>
                    </div>
                    <div className="flex gap-2">
                        {step === 'category' && items.some(i => i.type === 'recipe') && (
                            <button
                                onClick={() => {
                                    const recipes = items.filter(i => i.type === 'recipe').map(i => i.url);
                                    if (window.confirm(`Vols extreure automàticament les ${recipes.length} receptes d'aquesta llista?`)) {
                                        onBulkExtract(recipes);
                                    }
                                }}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                            >
                                Extreure Tot ({items.filter(i => i.type === 'recipe').length})
                            </button>
                        )}
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>
                </div>

                <div className="p-4 overflow-y-auto flex-grow">
                    {loading && (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm mb-4">
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {items.length === 0 ? (
                                <p className="text-center text-slate-500 col-span-full">No s'han trobat elements.</p>
                            ) : items.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleCategoryClick(item)}
                                    className={`text-left p-3 rounded-md border dark:border-slate-700 transition-colors flex items-center gap-2
                                        ${item.type === 'category' || (!item.type && step === 'root')
                                            ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50'
                                            : 'bg-white hover:border-blue-500 dark:bg-slate-900 text-sm'
                                        }`}
                                >
                                    <span className="text-lg">
                                        {item.type === 'category' || (!item.type && step === 'root') ? '📁' : '🥘'}
                                    </span>
                                    <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{item.title}</span>
                                    {(item.type === 'category' || (!item.type && step === 'root')) && <span className="ml-auto text-slate-400">→</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoryBrowserModal;
