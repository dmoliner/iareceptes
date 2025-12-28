import React, { useState } from 'react';
import { ADMIN_PASSWORD } from '../constants';

interface PasswordModalProps {
    onSuccess: () => void;
    onClose: () => void;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ onSuccess, onClose }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            onSuccess();
        } else {
            setError('Contrasenya incorrecta.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 shadow-lg p-8 w-full max-w-sm m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-4 text-center">Accés d'Administrador</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6 text-center">Introdueix la contrasenya per configurar el ChefBot.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            id="password-input"
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                setError('')
                            }}
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
                            placeholder="Contrasenya"
                            autoFocus
                        />
                        {error && <p id="password-error" className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>
                    <button type="submit" className="w-full bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-semibold py-3 px-4 hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors">
                        Accedir
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PasswordModal;