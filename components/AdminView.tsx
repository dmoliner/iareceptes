import React, { useState } from 'react';
import { Config } from '../types';
import BehaviorTab from './tabs/BehaviorTab';
import KnowledgeTab from './tabs/KnowledgeTab';
import TechnicalTab from './tabs/TechnicalTab';

interface AdminViewProps {
    config: Config;
    setConfig: (newConfig: Config) => void;
    onClose: () => void;
}

type TabName = 'behavior' | 'knowledge' | 'technical';

const AdminView: React.FC<AdminViewProps> = ({ config: initialConfig, setConfig: saveConfig, onClose }) => {
    const [activeTab, setActiveTab] = useState<TabName>('behavior');
    const [localConfig, setLocalConfig] = useState<Config>(initialConfig);

    const handleSave = () => {
        saveConfig(localConfig);
    };

    const tabs: { id: TabName, label: string }[] = [
        { id: 'behavior', label: 'Comportament' },
        { id: 'knowledge', label: 'Base de Coneixement' },
        { id: 'technical', label: 'Configuració Tècnica' },
    ];

    return (
        <div className="w-full min-h-screen flex flex-col items-center bg-gradient-to-br from-stone-50 to-rose-50 dark:from-stone-900 dark:to-fuchsia-950 p-4 sm:p-6 md:p-8 transition-colors duration-500">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/20 dark:border-slate-700 shadow-2xl p-6 md:p-8 w-full max-w-5xl flex flex-col h-full rounded-3xl ring-1 ring-black/5">

                <div className="flex justify-between items-center mb-8 border-b border-stone-200 dark:border-slate-800 pb-6 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-fuchsia-700 to-rose-800 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-fuchsia-900/20 dark:shadow-none">
                            <i className="fa-solid fa-sliders text-xl"></i>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Configuració</h2>
                            <p className="text-sm text-stone-500 dark:text-stone-400">Personalitza el teu ChefBot</p>
                        </div>
                    </div>
                </div>

                <div className="flex-shrink-0 mb-8">
                    <nav className="flex space-x-1 p-1 bg-stone-100 dark:bg-slate-800 rounded-xl">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === tab.id
                                    ? 'bg-white dark:bg-slate-700 text-fuchsia-700 dark:text-fuchsia-400 shadow-sm ring-1 ring-black/5'
                                    : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 min-h-[400px] scrollbar-thin scrollbar-thumb-rose-200 dark:scrollbar-thumb-slate-700">
                    {activeTab === 'behavior' && <BehaviorTab config={localConfig} setConfig={setLocalConfig} />}
                    {activeTab === 'knowledge' && <KnowledgeTab config={localConfig} setConfig={setLocalConfig} />}
                    {activeTab === 'technical' && <TechnicalTab config={localConfig} setConfig={setLocalConfig} />}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-stone-100 dark:border-slate-800 flex-shrink-0 mt-4">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-stone-600 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                        Cancel·lar
                    </button>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-rose-200/50 dark:hover:shadow-none hover:-translate-y-0.5 transition-all duration-200">
                        Guardar Canvis
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminView;