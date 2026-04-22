import json
import logging
from typing import Optional
import anthropic
from config import ANTHROPIC_API_KEY

logger = logging.getLogger(__name__)


def generate_ai_analysis(
    ticker: str,
    stock_info: dict,
    indicators: dict,
    prediction: Optional[dict],
    sentiment: Optional[dict],
) -> Optional[dict]:
    """
    Call Claude API to synthesise all data into a structured verdict.
    Returns a dict with verdict, conviction, analysis sections, etc.
    """
    if ANTHROPIC_API_KEY == "à_renseigner":
        return {
            "verdict": "N/A",
            "conviction": 0,
            "resume_court": "Clé API Anthropic non configurée dans config.py",
            "analyse_technique": "",
            "analyse_fondamentale": "",
            "catalyseurs_positifs": [],
            "risques_principaux": ["ANTHROPIC_API_KEY manquante"],
            "horizon_recommande": "N/A",
            "note_finale": "Veuillez configurer ANTHROPIC_API_KEY dans config.py.",
        }

    pred_section = ""
    if prediction:
        pred_section = f"""
PRÉDICTION MODÈLE ({prediction['horizon_days']}j) :
- Cible base case : {prediction['price_target']:.2f} ({prediction['upside_pct']:+.1f}%)
- Bull case : {prediction['bull_case']:.2f}
- Bear case : {prediction['bear_case']:.2f}
- Confiance modèle : {prediction['confidence_score']:.0f}%"""

    sent_section = ""
    if sentiment:
        sent_section = f"""
SENTIMENT MARCHÉ :
- Score news : {sentiment['score']:+.3f} (-1 à +1)
- Tendance : {sentiment['trend']}
- {sentiment['summary']}"""

    def _fmt(v):
        if v is None:
            return "N/A"
        if isinstance(v, float):
            return f"{v:.2f}"
        return str(v)

    prompt = f"""Tu es un analyste financier senior. Analyse cette action et donne ton verdict.

ACTION : {stock_info.get('name', ticker)} ({ticker})
SECTEUR : {stock_info.get('sector', 'N/A')} | PAYS : {stock_info.get('country', 'N/A')}
DESCRIPTION : {stock_info.get('description', '')[:200]}

DONNÉES TECHNIQUES :
- Score technique : {indicators.get('score', 0)}/100
- RSI (14) : {_fmt(indicators.get('rsi'))}
- Tendance EMA200 : {'Haussière ✅' if indicators.get('above_ema200') else 'Baissière ⚠️'}
- Signal MACD : {indicators.get('macd_signal', 'N/A')}
- ADX (force tendance) : {_fmt(indicators.get('adx'))}
- ATR (volatilité) : {_fmt(indicators.get('atr'))}
- Stochastique K : {_fmt(indicators.get('stoch_k'))}
- Bollinger %B : {_fmt(indicators.get('bb_pct'))}

FONDAMENTAUX :
- P/E trailing : {_fmt(stock_info.get('pe_ratio'))}
- P/E forward : {_fmt(stock_info.get('forward_pe'))}
- PEG : {_fmt(stock_info.get('peg_ratio'))}
- P/Book : {_fmt(stock_info.get('price_to_book'))}
- Dividende : {_fmt(stock_info.get('dividend_yield'))}
- Croissance BPA : {_fmt(stock_info.get('earnings_growth'))}
- Croissance CA : {_fmt(stock_info.get('revenue_growth'))}
- Beta : {_fmt(stock_info.get('beta'))}
- Cap. boursière : {_fmt(stock_info.get('market_cap'))}
{pred_section}
{sent_section}

Réponds UNIQUEMENT avec un JSON valide strictement dans ce format :
{{
  "verdict": "ACHETER|SURVEILLER|EVITER",
  "conviction": 3,
  "resume_court": "Une phrase synthétique.",
  "analyse_technique": "2-3 phrases sur la situation technique.",
  "analyse_fondamentale": "2-3 phrases sur les fondamentaux.",
  "catalyseurs_positifs": ["catalyseur 1", "catalyseur 2", "catalyseur 3"],
  "risques_principaux": ["risque 1", "risque 2"],
  "horizon_recommande": "court terme|moyen terme|long terme",
  "note_finale": "Paragraphe de synthèse en 4-5 phrases."
}}"""

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error from Claude: {e}\nRaw: {raw[:200]}")
        return None
    except Exception as e:
        logger.error(f"Claude API call failed: {e}")
        return None
