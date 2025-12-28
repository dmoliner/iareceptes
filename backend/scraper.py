import requests
from bs4 import BeautifulSoup
import json
import uuid
from urllib.parse import urljoin

class RecipeScraper:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'ca,es-ES;q=0.8,es;q=0.6,en;q=0.4',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
        }

    def scan_root_categories(self, url):
        """
        Scans the root URL for Level 0 categories (Top level menu items).
        """
        try:
            response = requests.get(url, headers=self.headers, timeout=15, verify=False)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html5lib')
            
            categories = []
            
            # Target the main menu: ul.nav.menu.mod-list
            nav_menu = soup.find('ul', class_='nav menu nav-pills mod-list')
            if nav_menu:
                # Direct children LIs only (Level 0)
                # find_all(recursive=False) on the UL finds LIs
                for li in nav_menu.find_all('li', recursive=False):
                    a = li.find('a', recursive=False) # Get the direct link
                    if a:
                        href = a.get('href')
                        text = a.get_text(strip=True)
                        
                        if href and not href.startswith('#') and text and text.lower() not in ['inici', 'contactar', 'qui som']:
                            full_url = urljoin(url, href)
                            categories.append({
                                "title": text,
                                "url": full_url,
                                "type": "category" 
                            })
                            
            return categories

        except Exception as e:
            return {"error": str(e)}

    def scan_category(self, url):
        """
        Scans a category page for:
        1. Subcategories (Level 1 nested items) - returned as type: 'category'
        2. Recipes (Level 2 items) - returned as type: 'recipe'
        """
        try:
            response = requests.get(url, headers=self.headers, timeout=15, verify=False)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html5lib')
            
            items = []

            # 1. Look for Subcategories (Children of the current active menu item)
            # Find the active LI in the menu
            current_li = soup.find('li', class_='current active')
            if current_li:
                # content of this LI might contain a UL with class 'nav-child'
                sub_ul = current_li.find('ul', class_='nav-child')
                if sub_ul:
                    for li in sub_ul.find_all('li', recursive=False):
                        a = li.find('a')
                        if a:
                             items.append({
                                "title": a.get_text(strip=True),
                                "url": urljoin(url, a.get('href')),
                                "type": "category"
                            })

            # 2. Look for Recipes
            # Pattern 1: Joomla Category Blog (kilometre0.cat specific)
            for h2 in soup.find_all('h2', itemprop="name"):
                a = h2.find('a', itemprop="url")
                if a and a.get('href'):
                    full_url = urljoin(url, a.get('href'))
                    if not any(i['url'] == full_url for i in items): # Avoid duplicates
                        items.append({
                            "title": a.get_text(strip=True),
                            "url": full_url,
                            "type": "recipe"
                        })
            
            # Pattern 2: Fallback
            if not any(i['type'] == 'recipe' for i in items):
                 main_content = soup.find('main') or soup.find(role='main') or soup.body
                 if main_content:
                    for a in main_content.find_all('a'):
                        href = a.get('href')
                        if href and len(href) > 5 and not href.startswith('#') and ('recepta' in href.lower() or 'carn' in href.lower() or 'peix' in href.lower()):
                             # Very broad, be careful. Maybe only text length?
                             # Let's trust Pattern 1 mostly for this specific site.
                             pass

            return items

        except Exception as e:
            return {"error": str(e)}

    def extract(self, url):
        try:
            # Bypass SSL verification for legacy/misconfigured sites
            # Increased timeout and added allow_redirects
            response = requests.get(url, headers=self.headers, timeout=15, verify=False, allow_redirects=True)
            response.raise_for_status()
            
            # Use 'html.parser' as it can be more lenient than html5lib sometimes, or stick to html5lib
            soup = BeautifulSoup(response.content, 'html5lib')
            
            # Strategy 0: Site specific (kilometre0.cat)
            if 'kilometre0.cat' in url:
                k0_data = self._extract_kilometre0(soup)
                if k0_data:
                    return k0_data

            # Strategy 1: JSON-LD (Schema.org)
            data = self._extract_json_ld(soup)
            if data:
                return data
                
            # Strategy 2: Fallback (Microdata/HTML headers) - To be implemented if needed
            # For now, return error if no JSON-LD found
            return {"error": "No structured data (JSON-LD) found."}
            
        except Exception as e:
            return {"error": str(e)}

    def _extract_kilometre0(self, soup):
        """
        Robust extraction for kilometre0.cat using a forward-scanning state machine approach.
        Fixes fragmented headers (IN-GREDIENTS) and nested P tags.
        """
        try:
            recipe = {
                "name": "Sense títol",
                "ingredients": [],
                "instructions": "",
                "imageUrl": ""
            }

            # 1. Title
            # Priority: itemprop="headline" > h2 inside page-header > h2 itemprop="name"
            title_node = soup.find(attrs={"itemprop": "headline"}) 
            if not title_node: 
                 header_div = soup.find('div', class_='page-header')
                 if header_div: title_node = header_div.find('h2')
            if not title_node:
                title_node = soup.find('h2', itemprop="name")
            
            if title_node:
                recipe['name'] = title_node.get_text(strip=True)

            # 2. Main Content Scanning
            # Try to find the main container. Usually itemprop="articleBody" or class="item-page"
            article_body = soup.find(attrs={"itemprop": "articleBody"})
            if not article_body:
                article_body = soup.find('div', class_='item-page')

            if article_body:
                sections = {"intro": [], "ingredients": [], "instructions": [], "guarnicio": [], "estris": [], "ampliacio": []}
                current_section = "intro" 

                # Iterate over ALL paragraphs and headers in order of appearance
                # Using descendants is safer but messy. using find_all recursive=True?
                # Let's iterate find_all(['p', 'h3', 'h4', 'div', 'ul', 'ol']) within article_body
                # preserving order.
                elements = article_body.find_all(['p', 'h3', 'h4', 'h5', 'ul', 'ol', 'div'], recursive=False)
                
                # If structure is flat P tags
                if not elements or len(elements) < 3:
                     elements = article_body.find_all(['p', 'h3', 'h4', 'h5', 'ul', 'ol', 'div']) # Recursive if flat structure failed

                for element in elements:
                    # Skip empty
                    text = element.get_text(" ", strip=True)
                    if not text: continue
                    
                    # Detect Header
                    is_header = False
                    header_key = ""

                    # Check explicit H tags
                    if element.name in ['h3', 'h4', 'h5']:
                        s_text = text.lower()
                        if "gredients" in s_text: header_key = "ingredients"; is_header = True
                        elif "preparaci" in s_text or "elaboraci" in s_text: header_key = "instructions"; is_header = True
                        elif "guarnici" in s_text: header_key = "guarnicio"; is_header = True
                        elif "estris" in s_text: header_key = "estris"; is_header = True
                        elif "ampliaci" in s_text: header_key = "ampliacio"; is_header = True
                    else:
                        # Check STRONGS inside P/DIV
                        strong = element.find(['strong', 'b'])
                        if strong:
                            s_text = strong.get_text(strip=True).lower()
                            if len(s_text) > 3: # Avoid noise
                                if "gredients" in s_text: header_key = "ingredients"; is_header = True
                                elif "preparaci" in s_text or "elaboraci" in s_text: header_key = "instructions"; is_header = True
                                elif "guarnici" in s_text: header_key = "guarnicio"; is_header = True
                                elif "estris" in s_text: header_key = "estris"; is_header = True
                                elif "ampliaci" in s_text: header_key = "ampliacio"; is_header = True

                    if is_header:
                        current_section = header_key
                    else:
                        # It's content
                        # Get text with newlines for <br>
                        content_text = element.get_text(separator='\n', strip=True)
                        if content_text:
                            sections[current_section].append(content_text)

                # 3. Process Sections
                
                # Ingredients
                # Join all text blocks, then split by newlines
                raw_ings = "\n".join(sections["ingredients"])
                clean_ings = []
                for line in raw_ings.split('\n'):
                    line = line.strip()
                    # Filter out header noise if it crept in
                    if len(line) < 2: continue
                    if "GREDIENTS" in line or "gredients" in line.lower(): continue
                    clean_ings.append(line)
                recipe['ingredients'] = clean_ings

                # Instructions
                instr_parts = sections["instructions"]
                
                # Append Extras
                if sections["guarnicio"]:
                    instr_parts.append("\n--- GUARNICIÓ ---\n" + "\n".join(sections["guarnicio"]))
                if sections["estris"]:
                    instr_parts.append("\n--- ESTRIS ---\n" + "\n".join(sections["estris"]))
                if sections["ampliacio"]:
                    instr_parts.append("\n--- AMPLIACIÓ ---\n" + "\n".join(sections["ampliacio"]))

                recipe['instructions'] = "\n".join(instr_parts)

            # 4. Image Extraction
            # Priority 1: Meta Tag og:image (Usually most reliable for social sharing)
            meta_img = soup.find("meta", property="og:image")
            if meta_img and meta_img.get("content"):
                recipe['imageUrl'] = urljoin("https://www.kilometre0.cat", meta_img.get("content"))
            else:
                # Priority 2: Image inside articleBody (usually the main recipe photo)
                images = []
                if article_body:
                    images = article_body.find_all('img')
                
                # Priority 3: Fallback to any images in main content area
                if not images:
                     main_area = soup.find('div', class_='item-page') or soup.find('main')
                     if main_area:
                         images = main_area.find_all('img')

                best_img = None
                for img in images:
                    src = img.get('src', '')
                    if not src: continue
                    
                    # Filter out logos, icons, print buttons, spacers
                    lower_src = src.lower()
                    if any(x in lower_src for x in ['logo', 'icon', 'print', 'email', 'spacer', 'pixel', 'facebook', 'twitter']):
                        continue
                    
                    # Heuristic: Recipe images usually have 'images/' path
                    if 'images/' in lower_src:
                        best_img = src
                        break 
                
                if best_img:
                    # Construct full absolute URL. Base URL is site root.
                    recipe['imageUrl'] = urljoin("https://www.kilometre0.cat", best_img)

            return recipe

        except Exception as e:
            # Fallback to JSON-LD if custom parsing fails
            print(f"Custom extraction failed: {e}")
            return None

    def _extract_json_ld(self, soup):
        scripts = soup.find_all('script', type='application/ld+json')
        for script in scripts:
            try:
                content = script.string.strip() if script.string else ""
                if not content:
                    continue
                    
                data = json.loads(content)
                
                # Handle graph structure
                if '@graph' in data:
                    for item in data['@graph']:
                        if self._is_recipe(item):
                            return self._format_recipe(item)
                
                # Handle direct object
                if self._is_recipe(data):
                    return self._format_recipe(data)
                    
                # Handle list
                if isinstance(data, list):
                    for item in data:
                        if self._is_recipe(item):
                            return self._format_recipe(item)
                            
            except json.JSONDecodeError:
                continue
                
        return None

    def _is_recipe(self, data):
        if not isinstance(data, dict):
            return False
        doc_type = data.get('@type')
        if isinstance(doc_type, list):
            return 'Recipe' in doc_type
        return doc_type == 'Recipe'

    def _format_recipe(self, data):
        # Extract ID (generate if missing)
        recipe_id = str(uuid.uuid4())
        
        # Extract Name
        name = data.get('name', 'Recepta sense títol')
        
        # Extract Ingredients
        ingredients = data.get('recipeIngredient', [])
        if isinstance(ingredients, str):
            ingredients = [ingredients]
            
        # Extract Instructions
        instructions_raw = data.get('recipeInstructions', [])
        instructions = ""
        
        if isinstance(instructions_raw, str):
            instructions = instructions_raw
        elif isinstance(instructions_raw, list):
            # Schema.org instructions can be a list of strings or objects (HowToStep)
            steps = []
            for item in instructions_raw:
                if isinstance(item, str):
                    steps.append(item)
                elif isinstance(item, dict) and 'text' in item:
                    steps.append(item['text'])
                elif isinstance(item, dict) and 'name' in item:
                    steps.append(item['name'])
            instructions = "\n".join(steps)
            
        # Extract Image
        image_url = None
        image_raw = data.get('image')
        if isinstance(image_raw, str):
            image_url = image_raw
        elif isinstance(image_raw, list) and image_raw:
             image_url = image_raw[0] if isinstance(image_raw[0], str) else image_raw[0].get('url')
        elif isinstance(image_raw, dict):
            image_url = image_raw.get('url')

        return {
            "id": recipe_id,
            "name": name,
            "ingredients": ingredients,
            "instructions": instructions,
            "imageUrl": image_url
        }
