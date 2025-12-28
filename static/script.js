document.addEventListener('DOMContentLoaded', () => {
    // --- Referències a Elements del DOM ---
    const chatView = document.getElementById('chat-view');
    const adminView = document.getElementById('admin-view');
    const passwordModal = document.getElementById('password-modal');
    const messagesContainer = document.getElementById('messages-container');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const showAdminButton = document.getElementById('show-admin-button');
    const closeAdminButton = document.getElementById('close-admin-button');
    const saveConfigButton = document.getElementById('save-config-button');
    const passwordForm = document.getElementById('password-form');
    const passwordInput = document.getElementById('password-input');
    const passwordError = document.getElementById('password-error');
    
    // --- Estat de l'Aplicació ---
    let config = {};
    let messages = [];
    let isLoading = false;
    const ADMIN_PASSWORD = 'recetas2024';

    // --- Funcions de Comunicació amb el Backend ---
    const persistConfig = async (showSuccessAlert = false) => {
        try {
            const response = await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.detail || 'No s\'ha pogut guardar la configuració al servidor.');
            }
            // Actualitza la configuració local amb la resposta del servidor
            config = await response.json(); 
            if (showSuccessAlert) {
                alert("Configuració guardada correctament!");
            }
            return true;
        } catch (error) {
            console.error("Error en persistir la configuració:", error);
            alert(`Error en guardar la configuració: ${error.message}`);
            return false;
        }
    };
    
    const saveConfigFromUI = async () => {
        // Actualitza l'objecte de configuració global des de les entrades del DOM abans de desar
        config.systemInstruction = document.getElementById('systemInstruction').value;
        config.offTopicResponse = document.getElementById('offTopicResponse').value;
        
        const examples = [];
        document.querySelectorAll('#finetuning-examples-container > div').forEach(div => {
            const user = div.querySelector('textarea[data-field="user"]').value;
            const model = div.querySelector('textarea[data-field="model"]').value;
            const id = div.querySelector('.remove-example-btn').dataset.id;
            if (user.trim() && model.trim()) {
                 examples.push({ id, user, model });
            }
        });
        config.finetuningExamples = examples;
        
        config.ollamaUrl = document.getElementById('ollamaUrl').value;
        config.ollamaModel = document.getElementById('ollamaModel').value;
        
        // Les webSources ja estan actualitzades a l'objecte `config`
        await persistConfig(true);
    };

    // --- Funcions de Renderitzat ---
    const renderMessage = (message) => {
        const bubble = document.createElement('div');
        bubble.className = `flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`;
        
        let sourcesHTML = '';
        if (message.sources && message.sources.length > 0) {
            sourcesHTML = `
                <div class="text-xs text-slate-500 mt-1 pl-2">
                    <span class="font-semibold">Fonts:</span>
                    <ul class="list-disc list-inside">
                        ${message.sources.map(source => `
                            <li>
                                <a href="${source.uri}" target="_blank" rel="noopener noreferrer" class="hover:underline text-blue-500">
                                    ${source.title || new URL(source.uri).hostname}
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </div>`;
        }
        
        let processedText = message.text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');

        bubble.innerHTML = `
            <div class="max-w-md" data-message-id="${message.id}">
                <div class="p-3 rounded-2xl ${message.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none'}">
                    <div class="prose dark:prose-invert prose-p:before:content-none prose-p:after:content-none">${processedText}</div>
                </div>
                ${sourcesHTML}
            </div>
        `;
        return bubble;
    };

    const scrollToBottom = () => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    const setLoading = (loading) => {
        isLoading = loading;
        sendButton.disabled = isLoading || chatInput.value.trim() === '';
        if (isLoading) {
            const loadingBubble = document.createElement('div');
            loadingBubble.id = 'loading-bubble';
            loadingBubble.className = 'flex justify-start';
            loadingBubble.innerHTML = `
                <div class="max-w-md p-3 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none">
                    <div class="flex items-center space-x-2">
                        <div class="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
                        <div class="w-2 h-2 bg-slate-500 rounded-full animate-pulse" style="animation-delay: 200ms"></div>
                        <div class="w-2 h-2 bg-slate-500 rounded-full animate-pulse" style="animation-delay: 400ms"></div>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(loadingBubble);
            scrollToBottom();
        } else {
            const loadingBubble = document.getElementById('loading-bubble');
            if (loadingBubble) loadingBubble.remove();
        }
    };
    
    // --- Lògica del Xat ---
    const handleSend = async () => {
        const text = chatInput.value.trim();
        if (text === '' || isLoading) return;

        const userMessage = { id: crypto.randomUUID(), text, sender: 'user', sources: [] };
        messages.push(userMessage);
        messagesContainer.appendChild(renderMessage(userMessage));
        chatInput.value = '';
        scrollToBottom();
        
        setLoading(true);

        const botMessage = { id: crypto.randomUUID(), text: '', sender: 'bot', sources: [] };
        messages.push(botMessage);
        const botBubble = renderMessage(botMessage);
        messagesContainer.appendChild(botBubble);
        const botTextContainer = botBubble.querySelector('.prose');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, config: config })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error del servidor: ${errorText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                botMessage.text += decoder.decode(value, { stream: true });
                botTextContainer.innerHTML = botMessage.text.replace(/\n/g, '<br>');
                scrollToBottom();
            }
            
            const sourceRegex = /\[Font:\s*(https?:\/\/[^\s\]]+)\]/g;
            let match;
            const sources = [];
            while ((match = sourceRegex.exec(botMessage.text)) !== null) {
                sources.push({ title: new URL(match[1]).hostname, uri: match[1] });
            }
            if (sources.length > 0) {
                botMessage.text = botMessage.text.replace(sourceRegex, '').trim();
                botMessage.sources = sources;
                const finalBubble = renderMessage(botMessage);
                botBubble.replaceWith(finalBubble);
            }

        } catch (error) {
            botMessage.text = `Error: ${error.message}`;
            botTextContainer.innerHTML = botMessage.text;
        } finally {
            setLoading(false);
        }
    };

    // --- Lògica del Panell d'Administració ---
    const switchTab = (tabName) => {
        document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.add('hidden'));
        document.getElementById(`${tabName}-tab-content`).classList.remove('hidden');
        document.querySelectorAll('.admin-tab-button').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('bg-blue-600', 'text-white');
                btn.classList.remove('bg-slate-200', 'dark:bg-slate-800');
            } else {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-slate-200', 'dark:bg-slate-800');
            }
        });
    };
    
    const renderAdminPanel = () => {
        renderBehaviorTab();
        renderKnowledgeTab();
        renderTechnicalTab();
    };
    
    const renderBehaviorTab = () => {
        const container = document.getElementById('behavior-tab-content');
        const examplesHTML = (config.finetuningExamples || []).map((ex, index) => `
            <div key="${ex.id}" class="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-2 items-center mb-2 p-2 border rounded-md dark:border-slate-700">
                <textarea data-index="${index}" data-field="user" placeholder="Pregunta de l'usuari..." class="h-24 w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800">${ex.user}</textarea>
                <textarea data-index="${index}" data-field="model" placeholder="Resposta ideal del model..." class="h-24 w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800">${ex.model}</textarea>
                <button data-id="${ex.id}" class="remove-example-btn text-red-500 hover:text-red-700 p-2">Elimina</button>
            </div>
        `).join('');

        container.innerHTML = `
            <section>
                <h3 class="text-lg font-semibold mb-2">Personalitat</h3>
                <div>
                    <label class="block text-sm font-medium mb-1">Instrucció del Sistema (System Prompt)</label>
                    <textarea id="systemInstruction" rows="4" class="w-full px-3 py-2 border rounded-md dark:border-slate-700 bg-slate-50 dark:bg-slate-800">${config.systemInstruction}</textarea>
                </div>
                <div class="mt-4">
                    <label class="block text-sm font-medium mb-1">Resposta per a Temes No Relacionats</label>
                    <textarea id="offTopicResponse" rows="2" class="w-full px-3 py-2 border rounded-md dark:border-slate-700 bg-slate-50 dark:bg-slate-800">${config.offTopicResponse}</textarea>
                </div>
            </section>
            <section>
                <h3 class="text-lg font-semibold mb-2">Ajust Fi (Finetuning)</h3>
                <p class="text-sm text-slate-500 mb-4">Defineix l'estil, to i format de les respostes del bot proporcionant exemples.</p>
                <div id="finetuning-examples-container">${examplesHTML}</div>
                <button id="add-example-btn" class="px-4 py-2 rounded-lg bg-blue-600 text-white">Afegeix Exemple</button>
            </section>
        `;
    };

    const renderKnowledgeTab = () => {
        const container = document.getElementById('knowledge-tab-content');
        
        const sourcesHTML = (config.webSources || []).map(source => `
            <div key="${source.id}" class="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded">
                <a href="${source.url}" target="_blank" class="text-sm truncate hover:underline" title="${source.url}">${source.url}</a>
                <button data-id="${source.id}" class="remove-url-btn text-sm text-red-500 hover:text-red-700">Elimina</button>
            </div>
        `).join('');

        container.innerHTML = `
            <section>
                <h3 class="text-lg font-semibold mb-2">Fonts d'Informació Web</h3>
                <p class="text-sm text-slate-500 mb-4">Afegeix URLs perquè el bot les utilitzi com a base de coneixement. El bot rebrà instruccions de basar les seves respostes en aquestes fonts.</p>
                <div class="flex gap-2 mb-4">
                    <input id="new-url-input" type="url" placeholder="Introdueix una URL" class="w-full px-3 py-2 border rounded-md dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <button id="add-url-btn" class="px-4 py-2 rounded-lg bg-blue-600 text-white">Afegeix URL</button>
                </div>
                <div id="web-sources-container" class="space-y-2 max-h-60 overflow-y-auto pr-2 border rounded-md p-2 dark:border-slate-700">
                    ${(config.webSources || []).length > 0 ? sourcesHTML : `<p class="text-sm text-slate-500 text-center p-4">No hi ha cap URL a la llista.</p>`}
                </div>
            </section>
            <section>
                <h3 class="text-lg font-semibold mb-2">Gestió de la Base de Dades</h3>
                <p class="text-sm text-slate-500 mb-4">Exporta la teva configuració i la base de coneixement a un fitxer .json. Pots importar-lo més tard.</p>
                <div class="flex gap-4">
                    <button id="export-json-btn" class="px-4 py-2 rounded-lg bg-green-600 text-white">Exporta a .json</button>
                    <label class="px-4 py-2 rounded-lg bg-purple-600 text-white cursor-pointer">
                        Importa des de .json
                        <input id="import-json-input" type="file" accept=".json" class="hidden" />
                    </label>
                </div>
                 <p class="text-xs text-slate-500 mt-2">Es recomana guardar el fitxer exportat en una carpeta 'knowledge' dins del teu projecte.</p>
            </section>
        `;
    };

    const renderTechnicalTab = () => {
        const container = document.getElementById('technical-tab-content');
        container.innerHTML = `
            <div class="p-4 border rounded-lg dark:border-slate-700 space-y-4">
                <h3 class="font-semibold text-lg">Configuració d'Ollama</h3>
                <p class="text-sm text-slate-500">Aquesta aplicació utilitza un servidor local d'Ollama per a les respostes de la IA. Assegura't que el teu servidor d'Ollama estigui en funcionament.</p>
                <div>
                    <label class="block text-sm font-medium mb-1">URL del Servidor</label>
                    <input id="ollamaUrl" type="text" value="${config.ollamaUrl}" class="w-full px-3 py-2 border rounded-md dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Model</label>
                    <input id="ollamaModel" type="text" value="${config.ollamaModel}" class="w-full px-3 py-2 border rounded-md dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                </div>
            </div>
        `;
    };

    // --- Gestió d'Events ---
    const setupAdminEventListeners = () => {
        document.querySelectorAll('.admin-tab-button').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        document.getElementById('admin-view').addEventListener('click', async (e) => {
            if (e.target.id === 'add-example-btn') {
                if (!config.finetuningExamples) config.finetuningExamples = [];
                config.finetuningExamples.push({ id: crypto.randomUUID(), user: '', model: '' });
                renderBehaviorTab();
            }
            if (e.target.classList.contains('remove-example-btn')) {
                config.finetuningExamples = config.finetuningExamples.filter(ex => ex.id !== e.target.dataset.id);
                renderBehaviorTab();
            }
            if (e.target.id === 'add-url-btn') {
                const newUrlInput = document.getElementById('new-url-input');
                const newUrl = newUrlInput.value.trim();
                if (newUrl && !(config.webSources || []).some(s => s.url === newUrl)) {
                    if (!config.webSources) config.webSources = [];
                    config.webSources.push({ id: crypto.randomUUID(), url: newUrl });
                    newUrlInput.value = '';
                    renderKnowledgeTab();
                    await persistConfig(); // Desa automàticament
                }
            }
            if (e.target.classList.contains('remove-url-btn')) {
                config.webSources = (config.webSources || []).filter(s => s.id !== e.target.dataset.id);
                renderKnowledgeTab();
                await persistConfig(); // Desa l'eliminació automàticament
            }
            if (e.target.id === 'export-json-btn') {
                const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'database.json';
                a.click();
                URL.revokeObjectURL(a.href);
            }
        });
        
        document.getElementById('import-json-input').addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const newConfig = JSON.parse(event.target.result);
                    if(newConfig.provider && newConfig.systemInstruction){
                       config = newConfig;
                       renderAdminPanel();
                       alert("Base de dades importada correctament.");
                    } else {
                        throw new Error("El fitxer no té un format de configuració vàlid.");
                    }
                } catch(error){
                    alert(`Error en importar: ${error.message}`);
                }
            };
            reader.readAsText(file);
        });
    };

    const init = async () => {
        showAdminButton.addEventListener('click', () => {
            chatView.classList.add('hidden');
            passwordModal.classList.remove('hidden');
            passwordInput.focus();
        });
        closeAdminButton.addEventListener('click', () => {
            adminView.classList.add('hidden');
            chatView.classList.remove('hidden');
        });
        
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (passwordInput.value === ADMIN_PASSWORD) {
                passwordModal.classList.add('hidden');
                adminView.classList.remove('hidden');
                passwordInput.value = '';
                passwordError.classList.add('hidden');
                renderAdminPanel();
            } else {
                passwordError.textContent = 'Contrasenya incorrecta.';
                passwordError.classList.remove('hidden');
            }
        });
        
        sendButton.addEventListener('click', handleSend);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });
        
        saveConfigButton.addEventListener('click', saveConfigFromUI);
        setupAdminEventListeners();

        try {
            const response = await fetch('/api/config');
            if(!response.ok) throw new Error("Network response was not ok");
            config = await response.json();
        } catch (error) {
            console.error("No s'ha pogut carregar la configuració del servidor", error);
            alert("Error crític: No s'ha pogut carregar la configuració del servidor.");
        }
    };

    init();
});
