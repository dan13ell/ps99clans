#!/usr/bin/env python3
"""
PS99 Clans – sestavení obsahu stránek.

Spuštění (z kořene repozitáře):   python3 _tools/build.py

- Stránky s hlavním oknem (index, topclans, ...): doplní <head> (popis, canonical, styly)
  a pod okno vloží text z _content/<klic>.html + patičku. Vše mezi značkami
  <!--SC:HEAD--> ... <!--/SC:HEAD--> a <!--SC:BODY--> ... <!--/SC:BODY--> se při
  dalším spuštění přepíše, zbytek stránky zůstává.
- Textové stránky (guides, about, privacy, ...) se generují celé z _content/.
- Vytvoří sitemap.xml.

Složky začínající podtržítkem GitHub Pages (Jekyll) nepublikuje.
"""
import html
import json
import os
import re
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://ps99clans.site"
ADS = "ca-pub-5302554896051137"
GA = "G-M5T889PLGJ"
CSS_V = "7"
JS_V = "2"
TODAY = datetime.date.today().isoformat()

# ---------------------------------------------------------------- stránky s oknem
# ads: "static" = reklamní skript hned, "defer" = až po načtení dat (site.js), "none"
APP = [
    dict(key="home", label="Guide & FAQ", file="index.html", url="/", ads="static", peek="Guide & FAQ",
         title="PS99 Clans – Live Pet Simulator 99 Clan Leaderboards & Stats",
         desc="Live Pet Simulator 99 clan leaderboards: top 1000 clans, clan battle points, leagues, top players, clan compare, live tracker and free OBS overlays. Updated every few seconds."),
    dict(key="topclans", label="About Top Clans", file="topclans/index.html", url="/topclans/", ads="static", peek="How it works",
         title="Top Clans – Live PS99 Clan Battle Leaderboard (Top 1000) | PS99 Clans",
         desc="Live leaderboard of the top 1000 Pet Simulator 99 clans. Sort by clan battle points or deposited diamonds, filter by country and see the time left in the active clan battle."),
    dict(key="leagues", label="About Leagues", file="leagues/index.html", url="/leagues/", ads="static", peek="How it works",
         title="PS99 Leagues Leaderboard – League Points & Rankings | PS99 Clans",
         desc="Live Pet Simulator 99 league leaderboard: league points, member counts and positions. Open any league to see its members and how much each one contributed."),
    dict(key="people", label="About Top Players", file="people/index.html", url="/people/", ads="static", peek="How it works",
         title="Top Players – PS99 Clan Battle Player Leaderboard | PS99 Clans",
         desc="The top 25,000 Pet Simulator 99 players in the current clan battle, ranked by battle points. Search by Roblox username or clan and open any player for hourly stats."),
    dict(key="compare", label="About Compare", file="compare/index.html", url="/compare/", ads="static", peek="How it works",
         title="Compare PS99 Clans – Live Head-to-Head Point Difference | PS99 Clans",
         desc="Compare two Pet Simulator 99 clans live: total battle points, point difference, diamonds, average per member and a live difference chart."),
    dict(key="overlays", label="About OBS Overlays", file="overlays/index.html", url="/overlays/", ads="static", peek="Guide & FAQ",
         title="Free PS99 OBS Overlays – Live Clan Points for Streamers | PS99 Clans",
         desc="Free Pet Simulator 99 overlays for OBS and Streamlabs: live clan points, clan versus, top clans, player points and points goal. Transparent, customizable, one link."),
    dict(key="clan-detail", label="About clan profiles", file="clan-detail/index.html", url=None, ads="defer", peek="About this page",
         title="Clan Profile – Members, Battle Points & Diamonds | PS99 Clans",
         desc="Pet Simulator 99 clan profile: every member with their clan battle points and deposited diamonds, the clan's place, medals, country and live tracker."),
    dict(key="league-detail", label="About league profiles", file="league-detail/index.html", url=None, ads="defer", peek="About this page",
         title="League Profile – Members & League Points | PS99 Clans",
         desc="Pet Simulator 99 league profile: members, their league points, the league's place on the leaderboard and its total score."),
    dict(key="people-detail", label="About player profiles", file="people-detail/index.html", url=None, ads="defer", peek="About this page",
         title="Player Stats – Battle Points, Rank & Hourly Chart | PS99 Clans",
         desc="Pet Simulator 99 player stats for the current clan battle: total points, global rank, hourly points chart, best hour and the players just ahead and behind."),
    dict(key="live", label="About the live tracker", file="live/index.html", url=None, ads="defer", peek="About this page",
         title="Live Clan Tracker – Real-Time PS99 Clan Points | PS99 Clans",
         desc="Watch a Pet Simulator 99 clan's battle points rise in real time with a live points graph, rank, diamonds and average per member."),
]
# jen hlavička (žádný obsah pod oknem)
HEAD_ONLY = [
    dict(file="live-placement/index.html", url="/live-placement/", robots=None,
         title="Live Top 500 – Animated PS99 Clan Battle Placement | PS99 Clans",
         desc="Animated live view of the top 500 Pet Simulator 99 clans in the current clan battle. Watch clans overtake each other as points come in."),
    dict(file="overlay/index.html", url=None, robots="noindex, nofollow",
         title="PS99 Clans – OBS Overlay", desc="Transparent overlay renderer for OBS. Create your overlay at ps99clans.site/overlays/."),
]

# ---------------------------------------------------------------- textové stránky
# section: drobečková navigace; nav: zvýrazněná položka v horní liště
DOCS = [
    dict(key="guides/index", out="guides/index.html", url="/guides/", ads="static", nav="guides", kind="hub"),
    dict(key="guides/clan-battles", out="guides/clan-battles/index.html", url="/guides/clan-battles/", ads="static", nav="guides", kind="article"),
    dict(key="guides/clans-explained", out="guides/clans-explained/index.html", url="/guides/clans-explained/", ads="static", nav="guides", kind="article"),
    dict(key="guides/find-a-clan", out="guides/find-a-clan/index.html", url="/guides/find-a-clan/", ads="static", nav="guides", kind="article"),
    dict(key="guides/battle-strategy", out="guides/battle-strategy/index.html", url="/guides/battle-strategy/", ads="static", nav="guides", kind="article"),
    dict(key="guides/reading-the-stats", out="guides/reading-the-stats/index.html", url="/guides/reading-the-stats/", ads="static", nav="guides", kind="article"),
    dict(key="guides/obs-overlays", out="guides/obs-overlays/index.html", url="/guides/obs-overlays/", ads="static", nav="guides", kind="article"),
    dict(key="guides/clan-battle-history", out="guides/clan-battle-history/index.html", url="/guides/clan-battle-history/", ads="static", nav="guides", kind="article"),
    dict(key="guides/glossary", out="guides/glossary/index.html", url="/guides/glossary/", ads="static", nav="guides", kind="article"),
    dict(key="about", out="about/index.html", url="/about/", ads="static", nav="about", kind="page"),
    dict(key="changelog", out="changelog/index.html", url="/changelog/", ads="none", nav="about", kind="page"),
    dict(key="contact", out="contact/index.html", url="/contact/", ads="none", nav="about", kind="page"),
    dict(key="privacy", out="privacy/index.html", url="/privacy/", ads="none", nav="about", kind="page"),
    dict(key="terms", out="terms/index.html", url="/terms/", ads="none", nav="about", kind="page"),
    dict(key="404", out="404.html", url=None, ads="none", nav="", kind="error"),
]

NAV = [
    ("home", "/", "Clans"),
    ("topclans", "/topclans/", "Top Clans"),
    ("leagues", "/leagues/", "Leagues"),
    ("people", "/people/", "Players"),
    ("compare", "/compare/", "Compare"),
    ("overlays", "/overlays/", "OBS Overlays"),
    ("guides", "/guides/", "Guides"),
    ("about", "/about/", "About"),
]


def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()


def write(p, s):
    full = os.path.join(ROOT, p)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(s)


def partial(key):
    """_content/<key>.html -> (meta dict, html). Hlavička: <!-- klic: hodnota --> řádky na začátku."""
    s = read(f"_content/{key}.html")
    meta = {}
    m = re.match(r"\s*<!--(.*?)-->", s, re.S)
    if m:
        for line in m.group(1).strip().splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        s = s[m.end():]
    return meta, s.strip() + "\n"


def esc(s):
    return html.escape(s, quote=True)


def strip_tags(s):
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def faq_ld(body):
    qs = re.findall(r"<details[^>]*>\s*<summary[^>]*>(.*?)</summary>\s*<div[^>]*>(.*?)</div>\s*</details>", body, re.S)
    if not qs:
        return None
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": strip_tags(q),
                        "acceptedAnswer": {"@type": "Answer", "text": strip_tags(a)}} for q, a in qs],
    }


def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "</script>"


def ads_tag():
    return (f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADS}"\n'
            '     crossorigin="anonymous"></script>')


def ga_tag():
    return (f'<script async src="https://www.googletagmanager.com/gtag/js?id={GA}"></script>\n'
            "    <script>\n      window.dataLayer = window.dataLayer || [];\n      function gtag(){dataLayer.push(arguments);}\n"
            f"      gtag('js', new Date());\n      gtag('config', '{GA}');\n    </script>")


def meta_block(title, desc, url, extra_ld=(), robots=None, css=True):
    out = [f'<meta name="description" content="{esc(desc)}">']
    if robots:
        out.append(f'<meta name="robots" content="{robots}">')
    if url:
        out.append(f'<link rel="canonical" href="{SITE}{url}">')
        out.append(f'<meta property="og:url" content="{SITE}{url}">')
    out += [
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="PS99 Clans">',
        f'<meta property="og:title" content="{esc(title)}">',
        f'<meta property="og:description" content="{esc(desc)}">',
        f'<meta property="og:image" content="{SITE}/images/favicon.png">',
        '<meta name="twitter:card" content="summary">',
        '<meta name="theme-color" content="#89B3F9">',
    ]
    if css:
        out.append(f'<link rel="stylesheet" href="/site.css?v={CSS_V}">')
    for o in extra_ld:
        if o:
            out.append(ld(o))
    return "\n    ".join(out)


def footer():
    return f"""<footer class="sc-foot">
  <div class="sc-foot-in">
    <div class="sc-foot-top">
      <div class="sc-foot-brand">
        <a href="/" aria-label="PS99 Clans home"><img src="/images/clans-logo.png" alt="PS99 Clans" width="145" height="54" loading="lazy"></a>
        <p>Free live clan leaderboards, player rankings and stream tools for Pet Simulator 99 – built and maintained by a PS99 player for the PS99 community.</p>
      </div>
      <div>
        <h4>Leaderboards</h4>
        <ul>
          <li><a href="/">Clans home</a></li>
          <li><a href="/topclans/">Top 1000 clans</a></li>
          <li><a href="/leagues/">Leagues</a></li>
          <li><a href="/people/">Top players</a></li>
          <li><a href="/live-placement/">Live top 500</a></li>
        </ul>
      </div>
      <div>
        <h4>Tools &amp; guides</h4>
        <ul>
          <li><a href="/compare/">Compare two clans</a></li>
          <li><a href="/overlays/">OBS overlays</a></li>
          <li><a href="/guides/">All guides</a></li>
          <li><a href="/guides/clan-battles/">Clan battles explained</a></li>
          <li><a href="/guides/find-a-clan/">How to find a clan</a></li>
        </ul>
      </div>
      <div>
        <h4>Site</h4>
        <ul>
          <li><a href="/about/">About</a></li>
          <li><a href="/contact/">Contact</a></li>
          <li><a href="/changelog/">What's new</a></li>
          <li><a href="/privacy/">Privacy policy</a></li>
          <li><a href="/terms/">Terms of use</a></li>
        </ul>
      </div>
    </div>
    <div class="sc-foot-bottom">
      <span>© <span data-sc-year>{TODAY[:4]}</span> PS99 Clans · Independent fan project. Not affiliated with, endorsed or sponsored by Roblox Corporation or BIG Games.</span>
      <span>Game data: official PS99 public API · Avatars: Roblox</span>
    </div>
  </div>
</footer>"""


# ---------------------------------------------------------------- panel pod herním oknem
def slug(t):
    return re.sub(r"[^a-z0-9]+", "-", strip_tags(t).lower()).strip("-")[:40]


def panelize(body, label):
    """Obsah do jednoho panelu ve stylu herního okna: hlavička s názvem a odkazy na sekce."""
    links = []

    def add_id(m):
        attrs, inner = m.group(1), m.group(2)
        if "data-nonav" in attrs:
            return m.group(0)
        if "id=" in attrs:
            i = re.search(r'id="([^"]+)"', attrs).group(1)
        else:
            i = "s-" + slug(inner)
            attrs += f' id="{i}"'
        txt = strip_tags(inner)
        short = "FAQ" if ("FAQ" in txt or "questions" in txt.lower()) else (txt if len(txt) <= 32 else txt[:30].rsplit(" ", 1)[0] + "…")
        links.append((i, short))
        return f"<h2{attrs}>{inner}</h2>"
    body = re.sub(r"<h2([^>]*)>(.*?)</h2>", add_id, body, flags=re.S)
    nav = "".join(f'<a href="#{i}">{esc(t)}</a>' for i, t in links)
    return (f'<section class="sc-panel" aria-label="{esc(label)}">\n'
            f'  <div class="sc-panel-head"><span class="sc-panel-label">{esc(label)}</span><nav class="sc-panel-nav" aria-label="On this page">{nav}</nav></div>\n'
            f'  <div class="sc-panel-body">\n{body}  </div>\n</section>\n')


# ---------------------------------------------------------------- úprava stránek s oknem
LABELS = {"/": "Clans", "/topclans/": "Top Clans", "/leagues/": "Leagues", "/people/": "People"}


def links_to_anchors(s):
    """<div class="menu-btn ..." onclick="location.href='/x/'"></div> -> <a ... href="/x/">"""
    def rep(m):
        cls, href = m.group(1), m.group(2)
        label = LABELS.get(href, "Back" if "close-btn" in cls else href.strip("/").replace("-", " ").title() or "Home")
        if "close-btn" in cls:
            label = "Close"
        return f'<a class="{cls}" href="{href}" aria-label="{esc(label)}" draggable="false"></a>'
    return re.sub(r'<div class="([^"]*(?:menu-btn|sub-btn|close-btn)[^"]*)"\s+onclick="location\.href=\'([^\']*)\'"\s*></div>', rep, s)


def strip_old(s):
    # cizí reklamní sítě / ověřovací kódy z dřívějška
    s = re.sub(r'\s*<script type="text/javascript">\s*var infolinks_pid[^<]*</script>\s*<script type="text/javascript" src="//resources\.infolinks\.com[^"]*"></script>', "", s)
    s = re.sub(r"\s*<!-- Bidvertiser\d+ -->", "", s)
    s = re.sub(r"\s*<!-- EZMob Site Validation Code:[^>]*-->", "", s)
    s = re.sub(r'\s*<meta name="verified-code"[^>]*>', "", s)
    return s


def set_ads(s, mode):
    tag_re = re.compile(r'\s*<script async src="https://pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js\?client=[^"]*"\s*crossorigin="anonymous"></script>')
    has = bool(tag_re.search(s))
    if mode == "static":
        if not has:
            s = s.replace("<head>", "<head>\n    " + ads_tag(), 1)
    else:
        s = tag_re.sub("", s)
    return s


def replace_block(s, name, content, anchor_before):
    start, end = f"<!--SC:{name}-->", f"<!--/SC:{name}-->"
    block = f"{start}\n    {content}\n    {end}"
    if start in s:
        return re.sub(re.escape(start) + ".*?" + re.escape(end), lambda m: block, s, flags=re.S)
    i = s.rfind(anchor_before) if anchor_before == "</body>" else s.find(anchor_before)
    assert i >= 0, anchor_before
    return s[:i] + block + "\n" + s[i:]


def html_tag(s, classes=None, attrs=None):
    m = re.search(r"<html[^>]*>", s)
    tag = '<html lang="en"'
    if classes:
        tag += f' class="{classes}"'
    for k, v in (attrs or {}).items():
        tag += f' {k}="{v}"'
    return s[:m.start()] + tag + ">" + s[m.end():]


def build_app(p):
    s = read(p["file"])
    s = strip_old(s)
    s = set_ads(s, p["ads"])
    s = html_tag(s, "sc-page", {"data-ads": p["ads"]})
    s = re.sub(r"<title>.*?</title>", f"<title>{esc(p['title'])}</title>", s, count=1, flags=re.S)
    s = re.sub(r'\s*<meta name="description"[^>]*>', "", s)
    meta, body = partial(p["key"])
    lds = [faq_ld(body)]
    if p["key"] == "home":
        lds.insert(0, {"@context": "https://schema.org", "@type": "WebSite", "name": "PS99 Clans", "url": SITE + "/",
                       "description": p["desc"], "inLanguage": "en"})
        lds.insert(1, {"@context": "https://schema.org", "@type": "Organization", "name": "PS99 Clans", "url": SITE + "/",
                       "logo": SITE + "/images/favicon.png", "email": "danielmairich@gmail.com"})
    s = replace_block(s, "HEAD", meta_block(p["title"], p["desc"], p["url"], lds), "</head>")
    s = links_to_anchors(s)
    content = (f'<main class="sc" id="guide" data-peek="{esc(p["peek"])}">\n{panelize(body, p["label"])}</main>\n{footer()}\n'
               f'    <script src="/site.js?v={JS_V}"></script>')
    s = replace_block(s, "BODY", content, "</body>")
    write(p["file"], s)


def build_head_only(p):
    s = read(p["file"])
    s = strip_old(s)
    s = re.sub(r"<title>.*?</title>", f"<title>{esc(p['title'])}</title>", s, count=1, flags=re.S)
    s = re.sub(r'\s*<meta name="description"[^>]*>', "", s)
    s = replace_block(s, "HEAD", meta_block(p["title"], p["desc"], p["url"], robots=p["robots"], css=False), "</head>")
    write(p["file"], s)


# ---------------------------------------------------------------- textové stránky
def topbar(active):
    items = "".join(f'<a href="{h}"{" class=\"on\"" if k == active else ""}>{t}</a>' for k, h, t in NAV)
    return f"""<header class="sc-top">
  <div class="sc-top-in">
    <a class="sc-logo" href="/" aria-label="PS99 Clans home"><img src="/images/clans-logo.png" alt="PS99 Clans" width="135" height="50"></a>
    <nav class="sc-nav" aria-label="Main">{items}</nav>
  </div>
</header>"""


def build_doc(d):
    meta, body = partial(d["key"])
    title, desc = meta["title"], meta["description"]
    url = d["url"]
    lds = []
    crumbs = [("Home", "/")]
    if d["key"].startswith("guides/") and d["key"] != "guides/index":
        crumbs.append(("Guides", "/guides/"))
    if url:
        crumbs.append((meta.get("crumb", meta.get("h1", title)), url))
        lds.append({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u} for i, (n, u) in enumerate(crumbs)]})
    if d["kind"] == "article":
        lds.append({"@context": "https://schema.org", "@type": "Article", "headline": meta.get("h1", title),
                    "description": desc, "datePublished": meta.get("published", meta.get("updated", TODAY)),
                    "dateModified": meta.get("updated", TODAY), "inLanguage": "en",
                    "mainEntityOfPage": SITE + url,
                    "author": {"@type": "Organization", "name": "PS99 Clans", "url": SITE + "/about/"},
                    "publisher": {"@type": "Organization", "name": "PS99 Clans", "logo": {"@type": "ImageObject", "url": SITE + "/images/favicon.png"}}})
    lds.append(faq_ld(body))

    crumb_html = ""
    if d["kind"] in ("article", "page") and url:
        crumb_html = '<div class="sc-crumbs">' + " › ".join(
            f'<a href="{u}">{esc(n)}</a>' if i < len(crumbs) - 1 else esc(n) for i, (n, u) in enumerate(crumbs)) + "</div>\n"
    meta_html = ""
    if d["kind"] == "article":
        upd = datetime.date.fromisoformat(meta.get("updated", TODAY))
        words = len(strip_tags(body).split())
        mins = max(2, round(words / 220))
        meta_html = (f'<div class="sc-meta"><span class="sc-chip">Updated {upd.strftime("%b")} {upd.day}, {upd.year}</span>'
                     f'<span class="sc-chip">{mins} min read</span><span class="sc-chip">By PS99 Clans</span></div>\n')
    body = body.replace("<!--META-->", meta_html)

    robots = meta.get("robots")
    head = [
        "<!DOCTYPE html>", '<html lang="en" class="sc-doc">', "<head>", "    " + ga_tag(),
    ]
    if d["ads"] == "static":
        head.append("    " + ads_tag())
    head += [
        '    <meta charset="utf-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        f"    <title>{esc(title)}</title>",
        '    <link rel="icon" href="/images/favicon.png" type="image/png">',
        '    <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        '    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700;800&family=Roboto:wght@700&display=swap" rel="stylesheet">',
        "    <!--SC:HEAD-->\n    " + meta_block(title, desc, url, lds, robots=robots) + "\n    <!--/SC:HEAD-->",
        "</head>",
        "<body>",
        topbar(d["nav"]),
        '<main class="sc">',
        '<div class="sc-article">' if d["kind"] in ("article", "page", "error") else "<div>",
        crumb_html + body,
        "</div>",
        "</main>",
        footer(),
        f'<script src="/site.js?v={JS_V}"></script>',
        "</body>",
        "</html>",
        "",
    ]
    write(d["out"], "\n".join(head))


def sitemap():
    urls = [p["url"] for p in APP if p["url"]] + [p["url"] for p in HEAD_ONLY if p["url"] and not p["robots"]]
    urls += [d["url"] for d in DOCS if d["url"]]
    pr = {"/": "1.0", "/topclans/": "0.9", "/people/": "0.9", "/leagues/": "0.8", "/guides/": "0.8"}
    rows = "".join(f"  <url><loc>{SITE}{u}</loc><lastmod>{TODAY}</lastmod><priority>{pr.get(u, '0.6')}</priority></url>\n" for u in urls)
    write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{rows}</urlset>\n')


if __name__ == "__main__":
    for p in APP:
        build_app(p)
    for p in HEAD_ONLY:
        build_head_only(p)
    for d in DOCS:
        build_doc(d)
    sitemap()
    print("ok:", len(APP), "app pages,", len(DOCS), "doc pages")
