# ChefBot: Assistent de Cuina Intel·ligent

Una aplicació full-stack moderna per a la gestió i consulta de receptes de cuina. Utilitza una arquitectura híbrida que combina un **cercador determinista** per a la màxima precisió amb les teves dades i la potència de la **IA generativa (Gemini)** per a la creació creativa de contingut.

## 🚀 Característiques Clau

-   **Backend Potent (Python/Flask):** API robusta que gestiona la lògica de negoci, l'scraping web i la connexió a base de dades.
-   **Base de Dades PostgreSQL:** Emmagatzematge persistent i estructurat per a milers de receptes.
-   **Intèrpret d'Intencions:** Un motor de cerca intel·ligent (Python) que entén el llenguatge natural i distingeix entre cerques per *títol* (Ex: "Pollo al horno") i per *ingredients* (Ex: "huevo patata cebolla").
-   **Modo Híbrid & Determinista:**
    -   **Cerca Segura (Local):** Prioritza sempre la base de dades local. Si troba resultats, els mostra en un format visual d'acordeons interactius (sense al·lucinacions).
    -   **IA Generativa (Gemini):** Activa automàticament el model de llenguatge només quan no hi ha resultats locals, permetent generar receptes noves i creatives.
    -   *Nota: El mode IA es pot activar/desactivar des del fitxer `.env` (`LLM=OFF`).*
-   **Interfície React Interactiva:** Disseny modern amb mode fosc, llistes desplegables, i gestió visual de la biblioteca de receptes.
-   **Scraping Avançat:** Capacitat per importar receptes automàticament des de webs com `kilometre0.cat`.

## 🛠️ Arquitectura Tècnica

-   **Frontend:** React, TypeScript, Vite, TailwindCSS.
-   **Backend:** Python 3, Flask, BeautifulSoup4 (Scraping).
-   **Base de Dades:** PostgreSQL 16+.
-   **IA:** Google Gemini (vía SDK `google-genai`).

## ⚙️ Requisits i Configuració

### 1. Base de Dades (PostgreSQL)
Assegura't de tenir PostgreSQL instal·lat i en execució.
L'aplicació crearà automàticament la base de dades `chefbot` i les taules necessàries a l'inici.

### 2. Backend (Python)
Configura l'entorn virtual i les dependències:

```bash
cd backend
# (Opcional) Crea un entorn virtual
python -m venv .venv
# Activa l'entorn (Windows)
.venv\Scripts\activate

# Instal·la dependències
pip install -r requirements.txt
```

Crea un fitxer `.env` dins de la carpeta `backend/` amb la següent configuració:

```env
DB_HOST=localhost
DB_NAME=chefbot
DB_USER=postgres
DB_PASSWORD=la_teva_contrasenya
DB_PORT=5432
API_KEY=LA_TEVA_CLAU_GEMINI
LLM=OFF  # Canvia a ON per activar la generació per IA quan no hi ha resultats
```

Per iniciar el servidor backend:
```bash
python app.py
```
*El servidor s'iniciarà a `http://127.0.0.1:5000`*

### 3. Frontend (React)
En una nova terminal:

```bash
npm install
npm run dev
```
*L'aplicació s'obrirà a `http://localhost:3000` (o similar)*

## � Ús de l'Aplicació

1.  **Tab "Coneixement":** Utilitza aquesta pestanya per importar receptes des d'URL o gestionar la teva base de dades (veure llistat, esborrar).
2.  **Xat:**
    -   Pregunta per receptes o ingredients.
    -   El bot cercarà primer a la teva col·lecció.
    -   Si troba coincidències, mostrarà una llista interactiva amb fotos i detalls desplegables.
    -   Si no troba res (i l'LLM està actiu), te'n proposarà una de nova.

## 🛡️ Estructura del Projecte

-   `/backend`: Codi del servidor Flask, models de DB i lògica d'scraping.
-   `/components`: components React (Vistes de Xat, Admin, Tabs).
-   `/services`: Serveis de frontend per connectar amb API i Gemini.
-   `/types`: definicions de tipus TypeScript.

---
Desenvolupat amb ❤️ i tecnologia agentic.
