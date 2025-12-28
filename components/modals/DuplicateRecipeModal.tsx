import React from 'react';

interface DuplicateRecipeModalProps {
    duplicateNames: string[];
    onClose: () => void;
}

const DuplicateRecipeModal: React.FC<DuplicateRecipeModalProps> = ({ duplicateNames, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 shadow-lg p-8 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-semibold text-red-500 mb-4 text-center">Receptes Duplicades</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6 text-center">Les següents receptes ja existeixen a la base de dades local i no s'han afegit:</p>
                <ul className="list-disc list-inside bg-slate-100 dark:bg-slate-800 p-4 max-h-40 overflow-y-auto">
                    {duplicateNames.map(name => (
                        <li key={name} className="text-slate-700 dark:text-slate-300">{name}</li>
                    ))}
                </ul>
                <div className="mt-6 flex justify-center">
                    <button onClick={onClose} className="w-full bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-semibold py-3 px-4 hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors">
                        Entesos
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DuplicateRecipeModal;