from flask import Flask, request, jsonify
from flask_cors import CORS
from scraper import RecipeScraper
from database import Database
import urllib3

# Suppress InsecureRequestWarning from urllib3 since we disabled SSL verification
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

scraper = RecipeScraper()
db = Database()

@app.route('/api/scan', methods=['POST'])
def scan_category():
    data = request.json
    if not data or 'url' not in data:
        return jsonify({"error": "URL is required"}), 400
    
    url = data['url']
    try:
        result = scraper.scan_category(url)
        if isinstance(result, dict) and "error" in result:
             return jsonify(result), 500
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/scan-root', methods=['POST'])
def scan_root():
    data = request.json
    # Default URL if not provided? Or require one. Let's require one or default to base.
    url = data.get('url', 'https://www.kilometre0.cat/')
    try:
        result = scraper.scan_root_categories(url)
        if isinstance(result, dict) and "error" in result:
             return jsonify(result), 500
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/extract', methods=['POST'])
def extract_recipe():
    data = request.json
    if not data or 'url' not in data:
        return jsonify({"error": "URL is required"}), 400
    
    url = data['url']
    try:
        result = scraper.extract(url)
        if "error" in result:
             return jsonify(result), 500
        
        # Inject the source URL so it's saved to DB
        result['url'] = url
        
        # Save to DB
        recipe_id = db.save_recipe_to_db(result)
        if recipe_id:
            result['db_id'] = recipe_id
            print(f"Saved recipe {result.get('name')} to DB with ID {recipe_id}")

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recipes/search', methods=['GET'])
def search_recipes():
    query = request.args.get('q', '')
    if not query:
        return jsonify([])
    
    results = db.search_recipes_in_db(query)
    return jsonify(results)

@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    results = db.get_all_recipes()
    return jsonify(results)

@app.route('/api/recipes', methods=['POST'])
def add_recipe():
    data = request.json
    if not data or 'name' not in data:
         return jsonify({"error": "Name is required"}), 400
    
    # Ensure source_url is unique or None if manual
    if 'url' not in data or not data['url']:
        import time
        data['url'] = f"manual-{time.time()}"

    recipe_id = db.save_recipe_to_db(data)
    if recipe_id:
        return jsonify({"id": recipe_id, "message": "Recipe saved"}), 201
    else:
        return jsonify({"error": "Failed to save recipe"}), 500

@app.route('/api/recipes/<recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id):
    success = db.delete_recipe(recipe_id)
    if success:
        return jsonify({"message": "Recipe deleted"}), 200
    else:
        return jsonify({"error": "Failed to delete recipe"}), 500

# --- Chat Endpoint (RAG) ---
import google.generativeai as genai
import os

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    if not data or 'message' not in data:
        return jsonify({"error": "Message is required"}), 400
    
    user_message = data['message']
    history = data.get('history', []) # List of {role: 'user'|'model', parts: [text]}

    # 1. Search DB for relevant context
    # We search based on the current user message. 
    # Improvement: We could use LLM to extract keywords from history + current message, but let's start simple.
    search_results = db.search_recipes_in_db(user_message)
    
    # Format recipes for context
    recipes_context = ""
    if search_results:
        recipes_context = "Here are the recipes found in your LOCAL database:\n"
        for r in search_results:
            # Include ID to perhaps allow fetching full details later if needed, but offering full text now is better for the LLM
            recipes_context += f"- ID: {r.get('id')}\n  Title: {r.get('name')}\n  Ingredients: {r.get('ingredients')}\n  Instructions: {r.get('instructions')}\n  Source: {r.get('source_url')}\n\n"
    else:
        recipes_context = "No relevant recipes found in the LOCAL database for this specific query."

    # 2. Construct Prompt
    system_instruction = """You are 'ChefBot', a helpful culinary assistant. 
Your goal is to help the user find recipes from their LOCAL database.

RULES:
1. ALWAYS prioritize recipes provided in the 'LOCAL DATABASE CONTEXT'.
2. If the user asks for a recipe (e.g., 'chicken recipes') and there are multiple matches in the context, ASK A CLARIFYING QUESTION to narrow it down (e.g., 'Do you want it with rice or roasted?').
3. If the user answers a clarifying question, use the conversation history to identify which local recipe they want and PROVIDE IT.
4. If a specific recipe from the context is chosen, provide its modifications or details based on the context.
5. If NO recipe in the context matches the user's request (even after clarification), YOU MAY generate a recipe using your own general knowledge, but you MUST state: "I don't have this in your personal cookbook, but here is a suggestion:".
6. Be friendly and concise.
"""

    # Build history for Gemini
    # Gemini python lib uses 'user' and 'model' roles. 
    # Frontend sends 'user' and 'bot'. We need to map.
    gemini_history = []
    for msg in history:
        role = 'user' if msg.get('sender') == 'user' else 'model'
        gemini_history.append({"role": role, "parts": [msg.get('text', '')]})

    # Add the Context to the latest message or as a system prompt. 
    # System prompts are set at model init, but we can prepend context to the current message for RAG.
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
         return jsonify({"text": "Error: GEMINI_API_KEY not set on server."}), 500
         
    model = genai.GenerativeModel('gemini-2.0-flash', system_instruction=system_instruction)
    
    # Start chat with history
    chat_session = model.start_chat(history=gemini_history)
    
    full_prompt = f"""
[LOCAL DATABASE CONTEXT]
{recipes_context}
[END CONTEXT]

User Request: {user_message}
"""
    
    try:
        response = chat_session.send_message(full_prompt)
        return jsonify({"text": response.text})
    except Exception as e:
        print(f"Gemini Error: {e}")
        return jsonify({"text": "I'm having trouble thinking right now. Please try again."}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
