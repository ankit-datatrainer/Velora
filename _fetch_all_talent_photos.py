import os
import re
import time
import json
import io
import urllib.request
import urllib.parse
from PIL import Image

OUT_DIR = "assets/talent"
os.makedirs(OUT_DIR, exist_ok=True)
W, H = 780, 1040

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

WIKI_HEADERS = {
    'User-Agent': 'VeloraAgencyApp/1.0 (info@veloramedia.com)'
}

TALENT_LIST = [
    # INFLUENCERS
    {
        "name": "Elvish Yadav",
        "slug": "elvish-yadav",
        "role": "YouTuber & TV Personality",
        "handle": "elvish_yadav",
        "wiki_title": "Elvish Yadav",
        "search_term": "Elvish Yadav portrait photoshoot",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/8/8f/Elvish_Yadav_snapped_at_BiggBoss_OTT2_Party_%28cropped%29.jpg"
        ]
    },
    {
        "name": "Dolly Chaiwala",
        "slug": "dolly-chaiwala",
        "role": "Nagpur's Viral Chaiwala",
        "handle": "dolly_ki_tapri_nagpur",
        "wiki_title": "Dolly Chaiwala",
        "search_term": "Dolly Chaiwala Nagpur tea maker portrait",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Dolly_Chaiwala_Nagpur.jpg/800px-Dolly_Chaiwala_Nagpur.jpg"
        ]
    },
    {
        "name": "Armaan Malik",
        "slug": "armaan-malik",
        "role": "Singer & Creator",
        "handle": "armaanmalik",
        "wiki_title": "Armaan Malik",
        "search_term": "Armaan Malik singer portrait photoshoot",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Armaan_Malik_at_the_Global_Indian_Music_Academy_Awards.jpg/800px-Armaan_Malik_at_the_Global_Indian_Music_Academy_Awards.jpg"
        ]
    },
    {
        "name": "Jubin Nautiyal",
        "slug": "jubin-nautiyal",
        "role": "Playback Singer",
        "handle": "jubin_nautiyal",
        "wiki_title": "Jubin Nautiyal",
        "search_term": "Jubin Nautiyal singer portrait photoshoot",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Jubin_Nautiyal_at_an_event.jpg/800px-Jubin_Nautiyal_at_an_event.jpg"
        ]
    },
    {
        "name": "Aarush Bhola",
        "slug": "aarush-bhola",
        "role": "Creator & Actor",
        "handle": "aarushbhola17",
        "wiki_title": None,
        "search_term": "Aarush Bhola influencer creator portrait",
        "fallback_urls": []
    },
    {
        "name": "Varun Yadav",
        "slug": "varun-yadav",
        "role": "Creator — Laila",
        "handle": "varuun_yadav",
        "wiki_title": None,
        "search_term": "Varun Yadav Laila creator portrait",
        "fallback_urls": []
    },
    {
        "name": "Chandrika Dixit",
        "slug": "chandrika-dixit",
        "role": "Creator — Vada Pav Girl",
        "handle": "chandrika.dixit",
        "wiki_title": None,
        "search_term": "Chandrika Dixit Vada Pav Girl Bigg Boss portrait",
        "fallback_urls": []
    },
    {
        "name": "Tejaswini Prakash",
        "slug": "tejaswini-prakash",
        "role": "Actor & Creator",
        "handle": "tejasswiprakash",
        "wiki_title": "Tejasswi Prakash",
        "search_term": "Tejasswi Prakash actress portrait photoshoot",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Tejasswi_Prakash_at_an_awards_ceremony.jpg/800px-Tejasswi_Prakash_at_an_awards_ceremony.jpg"
        ]
    },
    {
        "name": "Anjali Arora",
        "slug": "anjali-arora",
        "role": "Creator",
        "handle": "anjimaxuofficially",
        "wiki_title": "Anjali Arora",
        "search_term": "Anjali Arora Lock Upp photoshoot portrait",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Anjali_Arora_snapped_in_Lokhandwala.jpg/800px-Anjali_Arora_snapped_in_Lokhandwala.jpg"
        ]
    },
    {
        "name": "Munawar Faruqui",
        "slug": "munawar-faruqui",
        "role": "Comedian & Rapper",
        "handle": "munawar.faruqui",
        "wiki_title": "Munawar Faruqui",
        "search_term": "Munawar Faruqui standup comedian portrait",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/1/1a/Munawar_Faruqui_snapped_at_Miss_World_2024_at_Jio_Convention_Centre%2C_BKC.jpg"
        ]
    },
    # CELEBRITIES
    {
        "name": "Badshah",
        "slug": "badshah",
        "role": "Rapper & Producer",
        "handle": "badboyshah",
        "wiki_title": "Badshah (rapper)",
        "search_term": "Badshah rapper portrait photoshoot",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/c/cb/Badshah_snapped_promoting_their_song_%28cropped%29.jpg"
        ]
    },
    {
        "name": "Sonu Sood",
        "slug": "sonu-sood",
        "role": "Actor & Philanthropist",
        "handle": "sonu_sood",
        "wiki_title": "Sonu Sood",
        "search_term": "Sonu Sood actor portrait photoshoot",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/d/d5/Sonu_sood_colors_indian_telly_awards.jpg"
        ]
    },
    {
        "name": "Zareen Khan",
        "slug": "zareen-khan",
        "role": "Actor",
        "handle": "zareenkhan",
        "wiki_title": "Zareen Khan",
        "search_term": "Zareen Khan actress photoshoot portrait",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/d/d5/Zareen_Khan_grace_the_Lokmat_Most_Stylish_Awards_2023.jpg"
        ]
    },
    {
        "name": "Riteish Deshmukh",
        "slug": "riteish-deshmukh",
        "role": "Actor & Producer",
        "handle": "riteishd",
        "wiki_title": "Riteish Deshmukh",
        "search_term": "Riteish Deshmukh actor portrait photoshoot",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/e/eb/Riteish_Deshmukh_at_the_Promotion_of_%27Kyaa_Super_Kool_Hain_Hum%27_06.jpg"
        ]
    },
    {
        "name": "Vivek Oberoi",
        "slug": "vivek-oberoi",
        "role": "Actor & Entrepreneur",
        "handle": "vivekoberoi",
        "wiki_title": "Vivek Oberoi",
        "search_term": "Vivek Oberoi actor portrait photoshoot",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/4/40/Vivek_walks_ramp.jpg"
        ]
    },
    {
        "name": "Yo Yo Honey Singh",
        "slug": "yo-yo-honey-singh",
        "role": "Rapper & Music Producer",
        "handle": "yoyohoneysingh",
        "wiki_title": "Yo Yo Honey Singh",
        "search_term": "Yo Yo Honey Singh rapper photoshoot portrait",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/5/56/Yo_Yo_Honey_Singh_%282014%29_04.jpg"
        ]
    },
    {
        "name": "Elnaaz Norouzi",
        "slug": "elnaaz-norouzi",
        "role": "Actor & Model",
        "handle": "iamelnaaz",
        "wiki_title": "Elnaaz Norouzi",
        "search_term": "Elnaaz Norouzi actress photoshoot portrait",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Elnaaz_Norouzi_snapped_in_Bandra.jpg/800px-Elnaaz_Norouzi_snapped_in_Bandra.jpg"
        ]
    },
    {
        "name": "Tamannaah Bhatia",
        "slug": "tamannaah-bhatia",
        "role": "Actor",
        "handle": "tamannaahspeaks",
        "wiki_title": "Tamannaah Bhatia",
        "search_term": "Tamannaah Bhatia actress photoshoot portrait",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/6/60/Tamannaah_Bhatia_at_a_song_launch_from_the_film_Vedaa_%28cropped%29.jpg"
        ]
    },
    {
        "name": "Nora Fatehi",
        "slug": "nora-fatehi",
        "role": "Dancer, Singer & Actor",
        "handle": "norafatehi",
        "wiki_title": "Nora Fatehi",
        "search_term": "Nora Fatehi photoshoot portrait",
        "fallback_urls": [
            "https://upload.wikimedia.org/wikipedia/commons/b/b0/Nora-Fatehi-snapped-in-Bandra-2_%28cropped%29.jpg"
        ]
    }
]

def fetch_wiki_image(title):
    if not title:
        return None
    time.sleep(0.4)
    url = f"https://en.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(title)}&prop=pageimages&format=json&pithumbsize=1000"
    req = urllib.request.Request(url, headers=WIKI_HEADERS)
    try:
        data = json.loads(urllib.request.urlopen(req, timeout=10).read().decode('utf-8'))
        pages = data.get('query', {}).get('pages', {})
        for _, page in pages.items():
            if 'thumbnail' in page:
                return page['thumbnail']['source']
    except Exception as e:
        print(f"Wiki fetch error for {title}: {e}")
    return None

def fetch_image_from_bing_search(query):
    time.sleep(0.5)
    search_url = f"https://www.bing.com/images/search?q={urllib.parse.quote(query)}&form=HDRSC2&first=1"
    req = urllib.request.Request(search_url, headers=HEADERS)
    try:
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')
        matches = re.findall(r'murl&quot;:&quot;(https?://[^&]+?\.(?:jpg|jpeg|png|webp))&quot;', html)
        for m in matches:
            if not any(bad in m.lower() for bad in ['logo', 'icon', 'silhouette', 'placeholder']):
                return m
    except Exception as e:
        print(f"Bing search error for {query}: {e}")
    return None

def download_and_crop_image(img_url, out_path):
    req = urllib.request.Request(img_url, headers=HEADERS)
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        raw = resp.read()
        im = Image.open(io.BytesIO(raw)).convert('RGB')
        
        orig_w, orig_h = im.size
        target_ratio = W / H  # 780 / 1040 = 0.75
        orig_ratio = orig_w / orig_h
        
        if orig_ratio > target_ratio:
            new_w = int(orig_h * target_ratio)
            left = (orig_w - new_w) // 2
            im_cropped = im.crop((left, 0, left + new_w, orig_h))
        else:
            new_h = int(orig_w / target_ratio)
            top = int((orig_h - new_h) * 0.15)  # 15% from top
            top = max(0, min(top, orig_h - new_h))
            im_cropped = im.crop((0, top, orig_w, top + new_h))
            
        im_resized = im_cropped.resize((W, H), Image.Resampling.LANCZOS)
        im_resized.save(out_path, "JPEG", quality=92, optimize=True)
        print(f"  [SUCCESS] Saved {out_path} ({orig_w}x{orig_h} -> {W}x{H})")
        return True
    except Exception as e:
        print(f"  [FAILED] Download {img_url}: {e}")
        return False

def main():
    print(f"Starting photo download for {len(TALENT_LIST)} artists...")
    for item in TALENT_LIST:
        name = item["name"]
        slug = item["slug"]
        out_path = os.path.join(OUT_DIR, f"{slug}.jpg")
        print(f"\nProcessing {name} ({slug})...")
        
        urls_to_try = []
        if item.get("wiki_title"):
            wiki_url = fetch_wiki_image(item["wiki_title"])
            if wiki_url:
                urls_to_try.append(wiki_url)
                
        urls_to_try.extend(item.get("fallback_urls", []))
        
        bing_url = fetch_image_from_bing_search(item["search_term"])
        if bing_url:
            urls_to_try.append(bing_url)
            
        success = False
        for u in urls_to_try:
            print(f"  Trying URL: {u[:80]}...")
            if download_and_crop_image(u, out_path):
                success = True
                break
                
        if not success:
            print(f"  [WARNING] Could not download image for {name}!")

if __name__ == "__main__":
    main()
