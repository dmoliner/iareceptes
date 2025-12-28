import React, { useState, useEffect } from 'react';
import ChatView from './components/ChatView';
import AdminView from './components/AdminView';
import PasswordModal from './components/PasswordModal';
import { Config } from './types';
import { DEFAULT_CONFIG } from './constants';

const App: React.FC = () => {
    const [view, setView] = useState<'chat' | 'admin'>('chat');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [config, setConfig] = useState<Config>(() => {
        try {
            const savedConfigString = localStorage.getItem('chefbot-config-gemini');
            if (!savedConfigString) return DEFAULT_CONFIG;

            const savedConfig = JSON.parse(savedConfigString);

            // Migration logic for backward compatibility
            if (typeof savedConfig.useGoogleSearch !== 'undefined' && typeof savedConfig.knowledgeSource === 'undefined') {
                savedConfig.knowledgeSource = savedConfig.useGoogleSearch ? 'google' : 'none';
                delete savedConfig.useGoogleSearch;
            }
            if (!savedConfig.webSources) {
                savedConfig.webSources = [];
            }
            if (!savedConfig.localRecipes) {
                savedConfig.localRecipes = [];
            }
            
            // Merge with default to ensure all keys are present
            return { ...DEFAULT_CONFIG, ...savedConfig };

        } catch (error) {
            console.error("Error loading config from localStorage", error);
            return DEFAULT_CONFIG;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('chefbot-config-gemini', JSON.stringify(config));
        } catch (error) {
            console.error("Error saving config to localStorage", error);
        }
    }, [config]);

    const handleShowAdmin = () => {
        setShowPasswordModal(true);
    };

    const handlePasswordSuccess = () => {
        setShowPasswordModal(false);
        setView('admin');
    };

    const handleCloseAdmin = () => {
        setView('chat');
    };
    
    const handleSaveConfig = (newConfig: Config) => {
        setConfig(newConfig);
        alert("Configuració guardada correctament!");
    };


    return (
        <>
            {view === 'chat' && <ChatView config={config} onShowAdmin={handleShowAdmin} />}
            {view === 'admin' && <AdminView config={config} setConfig={handleSaveConfig} onClose={handleCloseAdmin} />}
            {showPasswordModal && (
                <PasswordModal 
                    onSuccess={handlePasswordSuccess} 
                    onClose={() => setShowPasswordModal(false)} 
                />
            )}
        </>
    );
};

export default App;