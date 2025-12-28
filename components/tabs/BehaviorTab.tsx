import React from 'react';
import { Config, FinetuningExample } from '../../types';

interface BehaviorTabProps {
    config: Config;
    setConfig: (config: Config) => void;
}

const BehaviorTab: React.FC<BehaviorTabProps> = ({ config, setConfig }) => {

    const handleSystemInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setConfig({ ...config, systemInstruction: e.target.value });
    };

    const handleOffTopicResponseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setConfig({ ...config, offTopicResponse: e.target.value });
    };

    const handleExampleChange = (id: string, field: 'user' | 'model', value: string) => {
        const updatedExamples = config.finetuningExamples.map(ex => 
            ex.id === id ? { ...ex, [field]: value } : ex
        );
        setConfig({ ...config, finetuningExamples: updatedExamples });
    };

    const addExample = () => {
        const newExample: FinetuningExample = { id: crypto.randomUUID(), user: '', model: '' };
        setConfig({ ...config, finetuningExamples: [...config.finetuningExamples, newExample] });
    };

    const removeExample = (id: string) => {
        const updatedExamples = config.finetuningExamples.filter(ex => ex.id !== id);
        setConfig({ ...config, finetuningExamples: updatedExamples });
    };

    return (
        <div className="space-y-8">
            <section>
                <h3 className="text-lg font-semibold mb-3">Personalitat</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="systemInstruction" className="block text-sm font-medium mb-1">Instrucció del Sistema (System Prompt)</label>
                        <textarea 
                            id="systemInstruction" 
                            value={config.systemInstruction}
                            onChange={handleSystemInstructionChange}
                            rows={4} 
                            className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-1 focus:ring-slate-400 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="offTopicResponse" className="block text-sm font-medium mb-1">Resposta per a Temes No Relacionats</label>
                        <textarea 
                            id="offTopicResponse"
                            value={config.offTopicResponse}
                            onChange={handleOffTopicResponseChange}
                            rows={2} 
                            className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-1 focus:ring-slate-400 focus:outline-none"
                        />
                    </div>
                </div>
            </section>
            <section>
                <h3 className="text-lg font-semibold mb-2">Exemples de Conversa (Few-shot)</h3>
                <p className="text-sm text-slate-500 mb-4">Guia el bot proporcionant exemples de preguntes i respostes ideals. Això ajuda a definir el to, l'estil i el format desitjats.</p>
                <div id="finetuning-examples-container" className="space-y-3">
                    {config.finetuningExamples.map(ex => (
                         <div key={ex.id} className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-3 items-center p-3 border dark:border-slate-700">
                            <textarea 
                                value={ex.user} 
                                onChange={(e) => handleExampleChange(ex.id, 'user', e.target.value)}
                                placeholder="Pregunta de l'usuari..." 
                                className="h-24 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 focus:ring-1 focus:ring-slate-400 focus:outline-none"
                            />
                            <textarea 
                                value={ex.model}
                                onChange={(e) => handleExampleChange(ex.id, 'model', e.target.value)} 
                                placeholder="Resposta ideal del model..." 
                                className="h-24 w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 focus:ring-1 focus:ring-slate-400 focus:outline-none"
                            />
                            <button onClick={() => removeExample(ex.id)} className="text-red-500 hover:text-red-700 p-2" aria-label="Elimina exemple">Elimina</button>
                        </div>
                    ))}
                </div>
                <button onClick={addExample} className="mt-4 px-4 py-2 bg-slate-700 text-white hover:bg-slate-600 dark:bg-slate-300 dark:text-slate-900 dark:hover:bg-slate-400 transition-colors text-sm font-medium">Afegeix Exemple</button>
            </section>
        </div>
    );
};

export default BehaviorTab;