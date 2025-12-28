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
        <div className="w-full min-h-screen flex flex-col items-center bg-slate-100 dark:bg-gray-900 p-4 sm:p-6 md:p-8">
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 shadow-lg p-6 md:p-8 w-full max-w-4xl flex flex-col h-full">
                <div className="flex justify-between items-center mb-6 border-b pb-4 dark:border-slate-700 flex-shrink-0">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Configuració del ChefBot</h2>
                </div>
                <div className="flex-shrink-0 mb-6">
                    <nav className="flex space-x-4 border-b border-slate-200 dark:border-slate-700">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-1 pb-3 text-sm font-medium transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-b-2 border-slate-800 dark:border-slate-200 text-slate-800 dark:text-slate-200'
                                        : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 min-h-[400px]">
                    {activeTab === 'behavior' && <BehaviorTab config={localConfig} setConfig={setLocalConfig} />}
                    {activeTab === 'knowledge' && <KnowledgeTab config={localConfig} setConfig={setLocalConfig} />}
                    {activeTab === 'technical' && <TechnicalTab config={localConfig} setConfig={setLocalConfig} />}
                </div>
                <div className="flex justify-end gap-4 pt-6 border-t dark:border-slate-700 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors">
                        Torna al Xat
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300 transition-colors">
                        Guarda la Configuració
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminView;