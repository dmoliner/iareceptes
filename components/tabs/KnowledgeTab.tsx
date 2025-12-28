import React, { useState, useMemo, useEffect } from 'react';
import { Config, WebSource, Recipe } from '../../types';
import DuplicateRecipeModal from '../modals/DuplicateRecipeModal';
import RecipeExtractor from '../RecipeExtractor';

interface KnowledgeTabProps {
    config: Config;
    setConfig: React.Dispatch<React.SetStateAction<Config>>;
}

type KnowledgeTabName = 'sources' | 'local' | 'management';

const KnowledgeTab: React.FC<KnowledgeTabProps> = ({ config, setConfig }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateRecipeNames, setDuplicateRecipeNames] = useState<string[]>([]);
    const [jsonImportError, setJsonImportError] = useState<string | null>(null);
    const [activeKnowledgeTab, setActiveKnowledgeTab] = useState<KnowledgeTabName>('sources');
    const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());

    // State for the new manual recipe form
    const [newRecipeName, setNewRecipeName] = useState('');
    const [newRecipeIngredients, setNewRecipeIngredients] = useState('');
    const [newRecipeInstructions, setNewRecipeInstructions] = useState('');
    const [newRecipeImageUrl, setNewRecipeImageUrl] = useState('');



    const handleKnowledgeSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({ ...config, knowledgeSource: e.target.value as Config['knowledgeSource'] });
    };

    const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
    const [dbRecipes, setDbRecipes] = useState<Recipe[]>([]);

    useEffect(() => {
        checkDbConnection();
        fetchRecipes();
    }, []);

    const checkDbConnection = async () => {
        try {
            // We can check connection by trying to fetch recipes. 
            // If it fails, likely DB issue or Backend issue.
            // Or add a specific health endpoint? 
            // For now, let's assume if fetchRecipes works, it's connected.
            const res = await fetch('http://localhost:5000/api/recipes');
            if (res.ok) {
                setDbStatus('connected');
            } else {
                setDbStatus('disconnected');
            }
        } catch (e) {
            setDbStatus('disconnected');
        }
    };

    const fetchRecipes = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/recipes');
            if (res.ok) {
                const data = await res.json();
                // Map DB result to Recipe type if needed. 
                // DB returns: id, name, ingredients (json), instructions, image_url, source_url ...
                // Frontend Recipe: id, name, ingredients (string[]), instructions, imageUrl?
                const mapped: Recipe[] = data.map((r: any) => ({
                    id: r.id,
                    name: r.name,
                    ingredients: Array.isArray(r.ingredients) ? r.ingredients : (JSON.parse(r.ingredients || '[]')),
                    instructions: r.instructions,
                    imageUrl: r.image_url
                }));
                // Update local visual state
                setDbRecipes(mapped);
                // Also update config.localRecipes so the chat instructions get them? 
                // The chat view likely constructs the prompt from `config.localRecipes`. 
                // So yes, we should sync them.
                setConfig(prev => ({ ...prev, localRecipes: mapped }));
            }
        } catch (error) {
            console.error("Error fetching recipes:", error);
        }
    };

    const handleAddUrl = () => {
        const newUrlInput = document.getElementById('new-url-input') as HTMLInputElement;
        if (!newUrlInput || !newUrlInput.value) return;

        try {
            const url = new URL(newUrlInput.value.trim()); // validates the URL
            const newSource: WebSource = { id: crypto.randomUUID(), url: url.href };
            const updatedSources = [...(config.webSources || []), newSource];
            setConfig({ ...config, webSources: updatedSources });
            newUrlInput.value = '';
        } catch (error) {
            alert("Si us plau, introdueix una URL vàlida.");
        }
    };

    const handleRemoveUrl = (id: string) => {
        const updatedSources = (config.webSources || []).filter(source => source.id !== id);
        setConfig({ ...config, webSources: updatedSources });
    };

    const handleExport = () => {
        try {
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'chefbot_config.json';
            a.click();
            URL.revokeObjectURL(a.href);
        } catch (error) {
            alert(`Error en exportar: ${error}`);
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const newConfig = JSON.parse(event.target?.result as string);
                if (newConfig.provider === 'gemini' && newConfig.systemInstruction) {
                    if (typeof newConfig.useGoogleSearch !== 'undefined' && typeof newConfig.knowledgeSource === 'undefined') {
                        newConfig.knowledgeSource = newConfig.useGoogleSearch ? 'google' : 'none';
                        delete newConfig.useGoogleSearch;
                    }
                    if (!newConfig.webSources) {
                        newConfig.webSources = [];
                    }
                    if (!newConfig.localRecipes) {
                        newConfig.localRecipes = [];
                    }
                    setConfig(newConfig);
                    alert("Configuració importada correctament.");
                } else {
                    throw new Error("El fitxer no té un format de configuració vàlid.");
                }
            } catch (error) {
                alert(`Error en importar: ${error}`);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleDeleteRecipe = async (id: string, name: string) => {
        if (confirm(`Estàs segur que vols eliminar la recepta "${name}" de la base de dades?`)) {
            try {
                const res = await fetch(`http://localhost:5000/api/recipes/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    fetchRecipes(); // Refresh list
                } else {
                    alert("Error eliminant la recepta de la base de dades.");
                }
            } catch (e) {
                alert("Error de connexió amb el servidor.");
            }
        }
    };

    const handleToggleSelectRecipe = (id: string) => {
        const newSelected = new Set(selectedRecipeIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedRecipeIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedRecipeIds.size === filteredRecipes.length) {
            setSelectedRecipeIds(new Set());
        } else {
            setSelectedRecipeIds(new Set(filteredRecipes.map(r => r.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedRecipeIds.size === 0) return;

        if (confirm(`Estàs segur que vols eliminar ${selectedRecipeIds.size} receptes? Aquesta acció no es pot desfer.`)) {
            let deletedCount = 0;
            const idsToDelete = Array.from(selectedRecipeIds);

            // Show some loading state if possible, but for now simple iteration
            for (const id of idsToDelete) {
                try {
                    await fetch(`http://localhost:5000/api/recipes/${id}`, { method: 'DELETE' });
                    deletedCount++;
                } catch (e) {
                    console.error(`Error deleting recipe ${id}:`, e);
                }
            }

            if (deletedCount > 0) {
                alert(`${deletedCount} receptes eliminades correctament.`);
                setSelectedRecipeIds(new Set());
                fetchRecipes();
            } else {
                alert("No s'ha pogut eliminar cap recepta.");
            }
        }
    };

    const handleAddRecipe = async () => {
        const trimmedName = newRecipeName.trim();
        if (!trimmedName) {
            alert("El títol de la recepta no pot estar buit.");
            return;
        }

        const newRecipe = {
            name: trimmedName,
            ingredients: newRecipeIngredients.split('\n').filter(line => line.trim() !== ''),
            instructions: newRecipeInstructions.trim(),
            imageUrl: newRecipeImageUrl.trim(),
            url: null // Manual entry
        };

        try {
            const res = await fetch('http://localhost:5000/api/recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRecipe)
            });
            if (res.ok) {
                setNewRecipeName('');
                setNewRecipeIngredients('');
                setNewRecipeInstructions('');
                setNewRecipeImageUrl('');
                alert("Recepta guardada a la base de dades a PostgreSQL!");
                fetchRecipes();
            } else {
                alert("Error guardant la recepta.");
            }
        } catch (e) {
            alert("Error connectant amb el servidor.");
        }
    };

    const handleRecipeAdded = (recipe: Recipe) => {
        // RecipeExtractor likely returns a recipe object. We should save it to DB.
        // Assuming RecipeExtractor calls this after extraction. 
        // We can just call fetchRecipes() because the backend extractor ALREADY saves to DB (as per my app.py change).
        // BUT, RecipeExtractor might pass the object directly.
        // If app.py /api/extract saves it, then we just need to refresh.
        console.log("Recipe added via extractor, refreshing DB list...");
        fetchRecipes();
    };

    const filteredRecipes = useMemo(() => {
        // Use dbRecipes state which is synced from DB
        if (!dbRecipes) return [];
        if (!searchTerm) return dbRecipes;
        return dbRecipes.filter(recipe =>
            recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [dbRecipes, searchTerm]);

    const knowledgeTabs: { id: KnowledgeTabName, label: string }[] = [
        { id: 'sources', label: "Fonts d'Informació" },
        { id: 'local', label: 'Coneixement Local (PostgreSQL)' },
        { id: 'management', label: 'Gestió' },
    ];

    return (
        <div>
            {dbStatus === 'disconnected' && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                    <p className="font-bold">Error de Connexió</p>
                    <p>No s'ha pogut connectar amb la base de dades PostgreSQL.</p>
                    <p className="mt-2">
                        <a href="https://www.postgresql.org/download/" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-red-900">
                            Descarregar PostgreSQL <i className="fa-solid fa-external-link-alt ml-1"></i>
                        </a>
                    </p>
                </div>
            )}

            <nav className="flex space-x-2 border-b dark:border-slate-700 mb-6">
                {knowledgeTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveKnowledgeTab(tab.id)}
                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeKnowledgeTab === tab.id
                            ? 'border-slate-700 text-slate-700 dark:border-slate-300 dark:text-slate-300'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            <div className="space-y-8">
                {activeKnowledgeTab === 'sources' && (
                    <>
                        <section>
                            <h3 className="text-lg font-semibold mb-2">Fonts d'Informació</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Selecciona com el bot accedeix a la informació externa per respondre.
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-center p-3 border dark:border-slate-700 has-[:checked]:bg-slate-50 dark:has-[:checked]:bg-slate-800/50 has-[:checked]:border-slate-400 dark:has-[:checked]:border-slate-500">
                                    <input
                                        type="radio"
                                        id="knowledge-none"
                                        name="knowledgeSource"
                                        value="none"
                                        checked={config.knowledgeSource === 'none'}
                                        onChange={handleKnowledgeSourceChange}
                                        className="h-4 w-4 text-slate-700 focus:ring-slate-600 border-gray-300 dark:border-gray-600"
                                    />
                                    <label htmlFor="knowledge-none" className="ml-3 block text-sm font-medium">
                                        Sense coneixement extern <span className="text-slate-500 text-xs">(Respon només amb el coneixement del model)</span>
                                    </label>
                                </div>
                                <div className="flex items-center p-3 border dark:border-slate-700 has-[:checked]:bg-slate-50 dark:has-[:checked]:bg-slate-800/50 has-[:checked]:border-slate-400 dark:has-[:checked]:border-slate-500">
                                    <input
                                        type="radio"
                                        id="knowledge-google"
                                        name="knowledgeSource"
                                        value="google"
                                        checked={config.knowledgeSource === 'google'}
                                        onChange={handleKnowledgeSourceChange}
                                        className="h-4 w-4 text-slate-700 focus:ring-slate-600 border-gray-300 dark:border-gray-600"
                                    />
                                    <label htmlFor="knowledge-google" className="ml-3 block text-sm font-medium">
                                        Cerca a Google <span className="text-slate-500 text-xs">(Accedeix a tota la web. Les fonts es mostraran)</span>
                                    </label>
                                </div>
                                <div className="flex items-center p-3 border dark:border-slate-700 has-[:checked]:bg-slate-50 dark:has-[:checked]:bg-slate-800/50 has-[:checked]:border-slate-400 dark:has-[:checked]:border-slate-500">
                                    <input
                                        type="radio"
                                        id="knowledge-urls"
                                        name="knowledgeSource"
                                        value="urls"
                                        checked={config.knowledgeSource === 'urls'}
                                        onChange={handleKnowledgeSourceChange}
                                        className="h-4 w-4 text-slate-700 focus:ring-slate-600 border-gray-300 dark:border-gray-600"
                                    />
                                    <label htmlFor="knowledge-urls" className="ml-3 block text-sm font-medium">
                                        Cerca només a les URLs especificades <span className="text-slate-500 text-xs">(Restringeix la cerca a una llista de llocs web)</span>
                                    </label>
                                </div>
                            </div>
                        </section>

                        {config.knowledgeSource === 'urls' && (
                            <section>
                                <h3 className="text-lg font-semibold mb-2">URLs per a la Cerca Restringida</h3>
                                <p className="text-sm text-slate-500 mb-4">Afegeix URLs perquè el bot les utilitzi com a única font de coneixement. La cerca es limitarà a aquests llocs.</p>
                                <div className="flex gap-2 mb-4">
                                    <input id="new-url-input" type="url" placeholder="https://www.exemple.com/receptes" className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800" />
                                    <button onClick={handleAddUrl} className="px-4 py-2 bg-slate-700 text-white hover:bg-slate-600 dark:bg-slate-300 dark:text-slate-900 dark:hover:bg-slate-400 whitespace-nowrap text-sm font-medium">Afegeix URL</button>
                                </div>
                                <div id="web-sources-container" className="space-y-2 max-h-60 overflow-y-auto pr-2 border p-2 dark:border-slate-700">
                                    {(config.webSources || []).length > 0 ? (config.webSources || []).map(source => (
                                        <div key={source.id} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800/50">
                                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-sm truncate hover:underline" title={source.url}>{source.url}</a>
                                            <button onClick={() => handleRemoveUrl(source.id)} className="remove-url-btn text-sm text-red-500 hover:text-red-700 ml-4 px-2" aria-label={`Elimina ${source.url}`}>Elimina</button>
                                        </div>
                                    )) : <p className="text-sm text-slate-500 text-center p-4">No hi ha cap URL a la llista.</p>}
                                </div>
                            </section>
                        )}
                    </>
                )}

                {activeKnowledgeTab === 'local' && (
                    <section className="space-y-6">
                        <RecipeExtractor config={config} onRecipeAdded={handleRecipeAdded} />

                        <details className="border-t dark:border-slate-700 pt-6">
                            <summary className="font-semibold text-lg cursor-pointer">Afegeix una Recepta Manualment</summary>
                            <div className="mt-4 space-y-4">
                                <div>
                                    <label htmlFor="recipe-title" className="block text-sm font-medium mb-1">Títol</label>
                                    <input
                                        id="recipe-title"
                                        type="text"
                                        value={newRecipeName}
                                        onChange={(e) => setNewRecipeName(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        placeholder="Paella Valenciana"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="recipe-image" className="block text-sm font-medium mb-1">URL de la Imatge (Opcional)</label>
                                    <input
                                        id="recipe-image"
                                        type="url"
                                        value={newRecipeImageUrl}
                                        onChange={(e) => setNewRecipeImageUrl(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                        placeholder="https://exemple.com/imatge.jpg"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="recipe-ingredients" className="block text-sm font-medium mb-1">Ingredients</label>
                                    <textarea
                                        id="recipe-ingredients"
                                        rows={5}
                                        placeholder="Un ingredient per línia..."
                                        value={newRecipeIngredients}
                                        onChange={(e) => setNewRecipeIngredients(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="recipe-instructions" className="block text-sm font-medium mb-1">Instruccions</label>
                                    <textarea
                                        id="recipe-instructions"
                                        rows={5}
                                        placeholder="Pas 1: Sofregir..."
                                        value={newRecipeInstructions}
                                        onChange={(e) => setNewRecipeInstructions(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                    />
                                </div>
                                <button onClick={handleAddRecipe} className="px-4 py-2 bg-slate-700 text-white hover:bg-slate-600 dark:bg-slate-300 dark:text-slate-900 dark:hover:bg-slate-400 text-sm font-medium">
                                    Afegeix Recepta
                                </button>
                            </div>
                        </details>

                        <details className="border-t dark:border-slate-700 pt-6" open>
                            <summary className="font-semibold text-lg cursor-pointer">Receptes Existents ({filteredRecipes.length})</summary>
                            <div className="mt-4">
                                <input
                                    type="search"
                                    placeholder="Cerca receptes..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 mb-4"
                                />
                                {filteredRecipes.length > 0 && (
                                    <div className="flex justify-between items-center mb-4 bg-slate-100 dark:bg-slate-800 p-2 rounded">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedRecipeIds.size === filteredRecipes.length && filteredRecipes.length > 0}
                                                onChange={handleSelectAll}
                                                className="h-5 w-5 text-slate-600 rounded border-gray-300 focus:ring-slate-500 mr-2"
                                            />
                                            <span className="text-sm font-medium">Seleccionar tot ({filteredRecipes.length})</span>
                                        </div>
                                        {selectedRecipeIds.size > 0 && (
                                            <button
                                                onClick={handleBulkDelete}
                                                className="px-3 py-1 bg-red-600 text-white text-sm font-medium hover:bg-red-700 rounded transition-colors"
                                            >
                                                Eliminar Seleccionats ({selectedRecipeIds.size})
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div id="local-recipes-container" className="space-y-2 max-h-60 overflow-y-auto pr-2 border p-2 dark:border-slate-700">
                                    {filteredRecipes.length > 0 ? filteredRecipes.map(recipe => (
                                        <div key={recipe.id} className="p-2 bg-slate-100 dark:bg-slate-800/50 group flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedRecipeIds.has(recipe.id)}
                                                onChange={() => handleToggleSelectRecipe(recipe.id)}
                                                className="mt-2 h-4 w-4 text-slate-600 rounded border-gray-300 focus:ring-slate-500"
                                            />
                                            <details className="flex-grow">
                                                <summary className="font-semibold cursor-pointer flex justify-between items-center">
                                                    <span>{recipe.name}</span>
                                                    <button onClick={(e) => { e.preventDefault(); handleDeleteRecipe(recipe.id, recipe.name); }} className="text-sm text-red-500 hover:text-red-700 ml-4 px-2 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Elimina ${recipe.name}`}>Elimina</button>
                                                </summary>
                                                <div className="mt-2 pl-4 border-l-2 dark:border-slate-600 prose prose-sm dark:prose-invert">
                                                    {recipe.imageUrl && (
                                                        <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-48 object-cover rounded-md mb-4" />
                                                    )}
                                                    <p><strong>Ingredients:</strong></p>
                                                    <ul>
                                                        {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                                                    </ul>
                                                    <p><strong>Instruccions:</strong></p>
                                                    <p>{recipe.instructions}</p>
                                                </div>
                                            </details>
                                        </div>
                                    )) : <p className="text-sm text-slate-500 text-center p-4">No hi ha cap recepta que coincideixi amb la cerca o la base de dades està buida.</p>}
                                </div>
                            </div>
                        </details>
                    </section>
                )}

                {activeKnowledgeTab === 'management' && (
                    <section>
                        <h3 className="text-lg font-semibold mb-2">Base de Dades PostgreSQL</h3>
                        <div className="flex flex-col gap-2 p-4 bg-slate-100 dark:bg-slate-800 rounded-md">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Estat:</span>
                                {dbStatus === 'connected' ? (
                                    <span className="text-green-600 font-bold flex items-center gap-1"><i className="fa-solid fa-circle-check"></i> Connectat</span>
                                ) : (
                                    <span className="text-red-600 font-bold flex items-center gap-1"><i className="fa-solid fa-circle-xmark"></i> Desconnectat</span>
                                )}
                            </div>
                            <p className="text-sm text-slate-500">
                                {dbStatus === 'connected'
                                    ? "La base de dades està operativa i guardant les receptes localment."
                                    : "No s'ha detectat una connexió a la base de dades."}
                            </p>
                            <a href="https://www.postgresql.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center gap-1">
                                <i className="fa-solid fa-database"></i> Web oficial de PostgreSQL
                            </a>
                        </div>

                        <div className="mt-8 border-t dark:border-slate-700 pt-6">
                            <h3 className="text-lg font-semibold mb-2">Gestió de la Configuració</h3>
                            <p className="text-sm text-slate-500 mb-4">Exporta la teva configuració actual a un fitxer .json. Pots importar-lo més tard per restaurar la configuració.</p>
                            <div className="flex gap-4">
                                <button onClick={handleExport} className="px-4 py-2 bg-slate-700 text-white hover:bg-slate-600 text-sm font-medium">Exporta a .json</button>
                                <label className="px-4 py-2 bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer text-sm font-medium">
                                    Importa des de .json
                                    <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                                </label>
                            </div>
                        </div>
                    </section>
                )}

            </div>

            {showDuplicateModal && (
                <DuplicateRecipeModal
                    duplicateNames={duplicateRecipeNames}
                    onClose={() => setShowDuplicateModal(false)}
                />
            )}
        </div>
    );
};

export default KnowledgeTab;