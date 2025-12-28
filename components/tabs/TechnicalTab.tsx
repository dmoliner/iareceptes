import React from 'react';
import { Config } from '../../types';

interface TechnicalTabProps {
    config: Config;
    setConfig: (config: Config) => void;
}

const TechnicalTab: React.FC<TechnicalTabProps> = ({ config, setConfig }) => {

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newProvider = e.target.value as Config['provider'];
        // Reset custom fields when switching to Gemini
        const updated: Partial<Config> = { provider: newProvider };
        if (newProvider === 'gemini') {
            delete updated.customEndpoint;
            delete updated.customModel;
        }
        setConfig({ ...config, ...updated } as Config);
    };

    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setConfig({ ...config, geminiModel: e.target.value as Config['geminiModel'] });
    };

    const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({ ...config, temperature: parseFloat(e.target.value) });
    };

    return (
        <div className="space-y-6">
            <div className="p-4 border dark:border-slate-700 space-y-4">
                <h3 className="font-semibold text-lg">Configuració del Model</h3>
                <div className="p-4 border dark:border-slate-700 space-y-4">
                    <label htmlFor="provider" className="block text-sm font-medium mb-1">Proveïdor</label>
                    <select
                        id="provider"
                        value={config.provider}
                        onChange={handleProviderChange}
                        className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-1 focus:ring-slate-400 focus:outline-none"
                    >
                        <option value="gemini">Gemini</option>
                        <option value="custom">Custom Endpoint</option>
                    </select>
                </div>
                {config.provider === 'gemini' ? (
                    <div className="p-4 border dark:border-slate-700 space-y-4">
                        <label htmlFor="geminiModel" className="block text-sm font-medium mb-1">Model Gemini</label>
                        <select
                            id="geminiModel"
                            value={config.geminiModel}
                            onChange={handleModelChange}
                            className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-1 focus:ring-slate-400 focus:outline-none"
                        >
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash (ràpid i eficient)</option>
                            <option value="gemini-2.5-pro">Gemini 2.5 Pro (més potent per a tasques complexes)</option>
                        </select>
                    </div>
                ) : (
                    <div className="p-4 border dark:border-slate-700 space-y-4">
                        <label htmlFor="customEndpoint" className="block text-sm font-medium mb-1">Endpoint URL</label>
                        <input
                            id="customEndpoint"
                            type="text"
                            value={config.customEndpoint || ''}
                            onChange={e => setConfig({ ...config, customEndpoint: e.target.value } as Config)}
                            className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-1 focus:ring-slate-400 focus:outline-none"
                        />
                        <label htmlFor="customModel" className="block text-sm font-medium mb-1 mt-2">Model</label>
                        <input
                            id="customModel"
                            type="text"
                            value={config.customModel || ''}
                            onChange={e => setConfig({ ...config, customModel: e.target.value } as Config)}
                            className="w-full px-3 py-2 border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-1 focus:ring-slate-400 focus:outline-none"
                        />
                    </div>
                )}
                <p className="text-sm text-slate-500">
                    Selecciona el model de Gemini i ajusta els paràmetres per controlar el comportament de la IA. Es requereix una clau API de Google AI Studio, que s'ha de configurar com a variable d'entorn (`API_KEY`).
                </p>
                <div>

                </div>
                <div>
                    <label htmlFor="temperature" className="block text-sm font-medium mb-1">Temperatura: {config.temperature.toFixed(1)}</label>
                    <input
                        id="temperature"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={config.temperature}
                        onChange={handleTemperatureChange}
                        className="w-full h-2 bg-slate-200 appearance-none cursor-pointer dark:bg-slate-700 [&::-webkit-slider-thumb]:bg-slate-700 [&::-moz-range-thumb]:bg-slate-700 dark:[&::-webkit-slider-thumb]:bg-slate-300 dark:[&::-moz-range-thumb]:bg-slate-300"
                    />
                    <p className="text-xs text-slate-500 mt-1">Valors baixos generen respostes més previsibles. Valors alts generen respostes més creatives.</p>
                </div>
            </div>
        </div>
    );
};

export default TechnicalTab;