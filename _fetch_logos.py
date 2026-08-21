import os
import urllib.request
import ssl

domains = {
    "itc": "itcportal.com",
    "puma": "puma.com",
    "flipkart": "flipkart.com",
    "tatacliq": "tatacliq.com",
    "boat": "boat-lifestyle.com",
    "snapdeal": "snapdeal.com",
    "vadilal": "vadilalgroup.com",
    "veeba": "veeba.in",
    "google": "google.com",
    "hdfcbank": "hdfcbank.com",
    "kissan": "kissan.in",
    "mccain": "mccainindia.com",
    "mamaearth": "mamaearth.in",
    "paperboat": "paperboatdrinks.com",
    "parle": "parleproducts.com",
    "federalbank": "federalbank.co.in",
    "fortune": "fortunefoods.com",
    "gocolors": "gocolors.com",
    "samsonite": "samsonite.com",
    "sebamed": "sebamedindia.com"
}

os.makedirs("assets/clients", exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

for name, domain in domains.items():
    # Google favicon API
    url = f"https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://{domain}&size=128"
    path = f"assets/clients/{name}.png"
    if not os.path.exists(path):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=ctx) as response:
                with open(path, 'wb') as f:
                    f.write(response.read())
            print(f"Downloaded {name}")
        except Exception as e:
            print(f"Failed {name}: {e}")
    else:
        print(f"Exists {name}")
