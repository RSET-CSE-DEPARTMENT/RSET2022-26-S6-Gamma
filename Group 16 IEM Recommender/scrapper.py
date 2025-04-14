import os
import requests
from bs4 import BeautifulSoup
from PIL import Image
from io import BytesIO

def scrape_and_save_images(iem_models):
    images_folder = "static/images/"
    os.makedirs(images_folder, exist_ok=True)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    for iem in iem_models:
        image_name = f"{iem.replace(' ', '_').replace('/', '_').replace('&', 'and')}".lower()
        image_path = os.path.join(images_folder, image_name + ".jpg")

        if os.path.exists(image_path):
            print(f"Image already exists: {image_path}")
            continue

        search_url = f"https://www.google.com/search?tbm=isch&q={iem.replace(' ', '+')}+IEM"
        try:
            response = requests.get(search_url, headers=headers, timeout=5)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, "html.parser")
            img_tags = soup.find_all("img")
            
            img_url = None
            for img_tag in img_tags:
                if "src" in img_tag.attrs and img_tag["src"].startswith("http"):
                    img_url = img_tag["src"]
                    break  # Use the first valid image URL

            if not img_url:
                print(f"No valid image found for {iem}, using default image.")
                img_url = "/static/images/default.jpg"  # Fallback image
                continue  # Skip downloading

            img_response = requests.get(img_url, timeout=5)
            img_response.raise_for_status()
            
            img = Image.open(BytesIO(img_response.content))
            img.save(image_path)
            print(f"Saved: {image_path}")

        except requests.exceptions.RequestException as e:
            print(f"Error fetching image for {iem}: {e}")

