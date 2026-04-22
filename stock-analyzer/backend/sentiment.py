import logging
import time
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Optional
import requests
import anthropic
from config import ANTHROPIC_API_KEY

logger = logging.getLogger(__name__)

_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; StockAnalyzer/1.0)"}


def _parse_rss(xml_text: str) -> list[dict]:
    """Parse RSS XML, return list of {title, summary, link, published}."""
    articles = []
    try:
        root = ET.fromstring(xml_text)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        for item in root.iter("item"):
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            summary = (item.findtext("description") or "")[:300].strip()
            published = (item.findtext("pubDate") or "").strip()
            if title:
                articles.append({"title": title, "link": link,
                                  "summary": summary, "published": published})
    except ET.ParseError as e:
        logger.warning(f"RSS XML parse error: {e}")
    return articles


def _fetch_articles(company_name: str, ticker: str, max_articles: int = 20) -> list[dict]:
    """Fetch recent news articles via Google News RSS."""
    articles = []
    queries = [
        f"{company_name} bourse résultats",
        f"{ticker} action finance",
    ]
    per_query = max(1, max_articles // len(queries))
    for query in queries:
        try:
            encoded = urllib.parse.quote(query)
            url = f"https://news.google.com/rss/search?q={encoded}&hl=fr&gl=FR&ceid=FR:fr"
            resp = requests.get(url, headers=_HEADERS, timeout=8)
            resp.raise_for_status()
            parsed = _parse_rss(resp.text)
            articles.extend(parsed[:per_query])
        except Exception as e:
            logger.warning(f"RSS fetch failed for '{query}': {e}")
    return articles[:max_articles]


def _score_articles_with_claude(articles: list[dict], company_name: str) -> list[dict]:
    """Batch score article titles/summaries with Claude."""
    if not articles or ANTHROPIC_API_KEY == "à_renseigner":
        return [{"title": a["title"], "score": 0.0, "reason": "API non configurée"} for a in articles]

    titles_block = "\n".join(
        f"{i+1}. {a['title']} — {a['summary'][:100]}"
        for i, a in enumerate(articles)
    )
    prompt = (
        f"Tu es un analyste financier. Score ces {len(articles)} titres d'articles "
        f"pour l'action {company_name} de -1 (très négatif) à +1 (très positif).\n\n"
        f"{titles_block}\n\n"
        "Retourne UNIQUEMENT un tableau JSON valide avec les clés: "
        "[{\"index\": 1, \"score\": 0.0, \"reason\": \"...\"}]. "
        "Pas de texte avant ou après le JSON."
    )

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        import json
        raw = response.content[0].text.strip()
        scored = json.loads(raw)
        result = []
        for i, article in enumerate(articles):
            match = next((s for s in scored if s.get("index") == i + 1), None)
            result.append({
                "title": article["title"],
                "link": article.get("link", ""),
                "published": article.get("published", ""),
                "score": float(match["score"]) if match else 0.0,
                "reason": match.get("reason", "") if match else "",
            })
        return result
    except Exception as e:
        logger.error(f"Claude scoring failed: {e}")
        return [{"title": a["title"], "link": a.get("link",""), "score": 0.0, "reason": str(e)} for a in articles]


def get_news_sentiment(ticker: str, company_name: str) -> dict:
    """
    Fetch recent news and compute sentiment score for a stock.
    Returns: score, top positives, top negatives, trend, summary.
    """
    articles = _fetch_articles(company_name, ticker)

    if not articles:
        return {
            "score": 0.0,
            "trend": "Neutre",
            "summary": "Aucun article trouvé.",
            "top_positive": [],
            "top_negative": [],
            "articles_count": 0,
        }

    scored = _score_articles_with_claude(articles, company_name)

    # Recency weighting: more recent articles count more
    now = time.time()
    weights = []
    for i, a in enumerate(articles):
        # Simple decay: first article = weight 1.0, last = 0.5
        weight = 1.0 - (i / max(len(articles) - 1, 1)) * 0.5
        weights.append(weight)

    total_weight = sum(weights)
    weighted_score = sum(s["score"] * w for s, w in zip(scored, weights)) / (total_weight or 1)
    weighted_score = max(-1.0, min(1.0, weighted_score))

    sorted_by_score = sorted(scored, key=lambda x: x["score"], reverse=True)
    top_positive = [a for a in sorted_by_score if a["score"] > 0][:3]
    top_negative = [a for a in sorted_by_score if a["score"] < 0][-3:]

    if weighted_score > 0.2:
        trend = "Positif"
    elif weighted_score < -0.2:
        trend = "Négatif"
    else:
        trend = "Neutre"

    positive_count = sum(1 for s in scored if s["score"] > 0)
    negative_count = sum(1 for s in scored if s["score"] < 0)
    summary = (
        f"{len(scored)} articles analysés — "
        f"{positive_count} positifs, {negative_count} négatifs. "
        f"Score moyen pondéré : {weighted_score:+.2f}."
    )

    return {
        "score": round(weighted_score, 3),
        "trend": trend,
        "summary": summary,
        "top_positive": top_positive,
        "top_negative": top_negative,
        "articles_count": len(scored),
    }
