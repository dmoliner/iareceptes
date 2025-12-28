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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
