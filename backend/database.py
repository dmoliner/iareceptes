import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

class Database:
    def __init__(self):
        self.host = os.getenv("DB_HOST", "localhost")
        self.database = os.getenv("DB_NAME", "chefbot")
        self.user = os.getenv("DB_USER", "postgres")
        self.password = os.getenv("DB_PASSWORD", "postgres")
        self.port = os.getenv("DB_PORT", "5432")
        self.conn = None
        
        self.connect()
        self.create_tables()

    def connect(self):
        try:
            self.conn = psycopg2.connect(
                host=self.host,
                database=self.database,
                user=self.user,
                password=self.password,
                port=self.port
            )
            print("Connected to PostgreSQL database")
        except Exception as e:
            print(f"Error connecting to database: {e}")
            # Optional: Attempt to create database if it doesn't exist? 
            # For now, let's assume the DB exists or let the user know.

    def create_tables(self):
        if not self.conn:
            return

        commands = [
            """
            CREATE TABLE IF NOT EXISTS recipes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                ingredients JSONB,
                instructions TEXT,
                image_url TEXT,
                source_url TEXT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        ]
        
        try:
            cur = self.conn.cursor()
            for command in commands:
                cur.execute(command)
            cur.close()
            self.conn.commit()
            print("Tables created successfully")
        except Exception as e:
            print(f"Error creating tables: {e}")
            if self.conn:
                self.conn.rollback()

    def save_recipe_to_db(self, recipe_data):
        """
        Saves a recipe to the database.
        recipe_data should be a dictionary with keys: name, ingredients, instructions, imageUrl, url (source)
        """
        if not self.conn:
            print("No database connection")
            return None

        # Prepare data
        name = recipe_data.get('name')
        ingredients = recipe_data.get('ingredients', []) # Make sure this is list before json dumping if needed, but psycopg2 adapts lists to arrays or jsonb?
        # If using JSONB, passing a python list/dict works with Json adapter or manually dumping.
        # Let's use json.dumps for safety if not using Json adapter, BUT psycopg2 handles JSONB automatically if we pass valid json-compatible objects usually.
        # Let's use existing json lib just in case or rely on psycopg2.extras.Json
        from psycopg2.extras import Json
        
        instructions = recipe_data.get('instructions')
        image_url = recipe_data.get('imageUrl')
        source_url = recipe_data.get('url')

        sql = """
            INSERT INTO recipes (name, ingredients, instructions, image_url, source_url)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (source_url) 
            DO UPDATE SET 
                name = EXCLUDED.name,
                ingredients = EXCLUDED.ingredients,
                instructions = EXCLUDED.instructions,
                image_url = EXCLUDED.image_url,
                created_at = CURRENT_TIMESTAMP
            RETURNING id;
        """
        
        try:
            cur = self.conn.cursor()
            cur.execute(sql, (name, Json(ingredients), instructions, image_url, source_url))
            recipe_id = cur.fetchone()[0]
            self.conn.commit()
            cur.close()
            return recipe_id
        except Exception as e:
            print(f"Error saving recipe: {e}")
            if self.conn:
                self.conn.rollback()
            return None

    def search_recipes_in_db(self, query):
        if not self.conn:
            return []
            
        # --- INTERPRETER LOGIC ---
        # 1. Normalize query
        raw_query = query.lower().strip()
        
        # 2. Tokenize and remove stop words (Spanish/Catalan common words)
        stop_words = {'la', 'el', 'de', 'con', 'amb', 'i', 'y', 'para', 'per', 'una', 'un', 'receta', 'recepta', 'vull', 'quiero', 'fer', 'hacer', 'tengo', 'tinc'}
        tokens = [t for t in raw_query.replace(',', ' ').split() if t not in stop_words and len(t) > 2]
        
        if not tokens:
            # Fallback for very short queries or only stopwords
            tokens = [raw_query]

        print(f"DEBUG: Interpreted tokens: {tokens}")

        # 3. Construct SQL dynamically based on tokens
        # We want to match ANY of the tokens in the name OR ALL tokens in ingredients if possible.
        # Strategy:
        # - Rank 1: Exact matches in Name
        # - Rank 2: Partial matches in Name
        # - Rank 3: Matches in Ingredients (for ingredient listings)
        
        # Let's simplify: Search for tokens in name OR ingredients.
        # But for ingredients, we might want to check if ALL tokens exist?
        # User request: "identificar si el usuario quiere una receta o que a partir de ciertos ingredientes..."
        
        # Query construction:
        # We will search for rows where the NAME matches at least one token
        # OR where the INGREDIENTS match at least one token.
        # We can order by the number of matches to surface best results.
        
        conditions = []
        params = []
        
        # ILIKE for Name (broad match for the whole query phrase + individual tokens)
        conditions.append("name ILIKE %s")
        params.append(f"%{raw_query}%")
        
        for token in tokens:
            # Name match (partial)
            conditions.append("name ILIKE %s")
            params.append(f"%{token}%")
            
            # Ingredient match (inside JSONB string representation)
            conditions.append("ingredients::text ILIKE %s")
            params.append(f"%{token}%")

        where_clause = " OR ".join(conditions)
        
        sql = f"""
            SELECT *, 
                   (CASE WHEN name ILIKE %s THEN 3 ELSE 0 END) + 
                   (CASE WHEN ingredients::text ILIKE %s THEN 1 ELSE 0 END) as relevance
            FROM recipes 
            WHERE {where_clause}
            ORDER BY relevance DESC, created_at DESC
            LIMIT 20
        """
        
        # Add params for the ranking clause (exact phrase match + token match?)
        # To simplify ranking logic in SQL without complex parameter duplication hell:
        # We'll stick to a simpler query but ensures we catch ingredients keywords.
        
        # REVISED SIMPLE QUERY STRATEGY:
        # Just use the constructed WHERE clause. The OR logic ensures if I search "patata", I get recipes with "patata" in name OR ingredients.
        
        sql = f"""
            SELECT * FROM recipes 
            WHERE {where_clause}
            LIMIT 20
        """
        
        try:
            cur = self.conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(sql, tuple(params))
            results = cur.fetchall()
            cur.close()
            return results
        except Exception as e:
            print(f"Error searching recipes: {e}")
            return []
            
    def get_all_recipes(self):
        if not self.conn:
            return []
            
        sql = "SELECT * FROM recipes ORDER BY created_at DESC"
        
        try:
            cur = self.conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(sql)
            results = cur.fetchall()
            cur.close()
            return results
        except Exception as e:
            print(f"Error getting recipes: {e}")
            return []

    def close(self):
        if self.conn:
            self.conn.close()

    def delete_recipe(self, recipe_id):
        if not self.conn:
            return False
            
        sql = "DELETE FROM recipes WHERE id = %s"
        
        try:
            cur = self.conn.cursor()
            cur.execute(sql, (recipe_id,))
            rows_deleted = cur.rowcount
            self.conn.commit()
            cur.close()
            return rows_deleted > 0
        except Exception as e:
            print(f"Error deleting recipe: {e}")
            if self.conn:
                self.conn.rollback()
            return False

