import logging
from typing import Optional
import pandas as pd
import numpy as np

from config import SCREENER_UNIVERSES
from backend.data_fetcher import (
    get_stock_data, get_stock_info, get_sp500_tickers,
    get_cac40_tickers, get_eurostoxx50_tickers,
)
from backend.indicators import calculate_indicators, calculate_technical_score

logger = logging.getLogger(__name__)


def _fundamental_score(info: dict) -> float:
    """Score fondamental de 0 à 100."""
    score = 0.0

    pe = info.get("pe_ratio")
    if pe and pe > 0:
        if pe < 10:
            score += 25
        elif pe < 15:
            score += 20
        elif pe < 20:
            score += 12
        elif pe < 30:
            score += 5
        else:
            score -= 5

    eps_growth = info.get("earnings_growth")
    if eps_growth is not None:
        if eps_growth > 0.20:
            score += 20
        elif eps_growth > 0.10:
            score += 15
        elif eps_growth > 0:
            score += 8
        else:
            score -= 5

    div_yield = info.get("dividend_yield")
    if div_yield:
        if div_yield > 0.05:
            score += 15
        elif div_yield > 0.03:
            score += 10
        elif div_yield > 0.01:
            score += 5

    market_cap = info.get("market_cap")
    if market_cap:
        if market_cap > 10_000_000_000:
            score += 10  # large cap: stability
        elif market_cap > 1_000_000_000:
            score += 5

    peg = info.get("peg_ratio")
    if peg and peg > 0:
        if peg < 1:
            score += 15
        elif peg < 1.5:
            score += 8
        elif peg > 3:
            score -= 5

    rev_growth = info.get("revenue_growth")
    if rev_growth is not None and rev_growth > 0.05:
        score += 10

    return max(0.0, min(100.0, score))


def _get_universe_tickers(universe: str) -> list[str]:
    if universe == "cac40":
        return get_cac40_tickers()
    elif universe == "eurostoxx50":
        return get_eurostoxx50_tickers()
    elif universe == "sp500":
        tickers = get_sp500_tickers()
        return tickers[:100] if tickers else []  # cap at 100 for speed
    else:
        return []


def _compute_1m_change(df: Optional[pd.DataFrame]) -> Optional[float]:
    if df is None or len(df) < 22:
        return None
    return (df["Close"].iloc[-1] - df["Close"].iloc[-22]) / df["Close"].iloc[-22] * 100


def run_screener(
    universe: str = "cac40",
    include_sentiment: bool = False,
    progress_callback=None,
) -> pd.DataFrame:
    """
    Score all tickers in the universe and rank by composite score.

    Composite = technical*40% + fundamental*40% + sentiment*20% (if enabled)
    Returns a DataFrame sorted by composite score descending.
    """
    tickers = _get_universe_tickers(universe)
    if not tickers:
        logger.error(f"Unknown universe: {universe}")
        return pd.DataFrame()

    rows = []
    total = len(tickers)

    for i, ticker in enumerate(tickers):
        if progress_callback:
            progress_callback(i / total, f"Analyse {ticker} ({i+1}/{total})")

        try:
            df = get_stock_data(ticker, period="1y")
            info = get_stock_info(ticker)

            if df is None or df.empty:
                continue

            df = calculate_indicators(df)
            tech_result = calculate_technical_score(df)

            tech_score_raw = tech_result.get("score", 0)
            # Normalize from [-100,+100] to [0,100]
            tech_score = (tech_score_raw + 100) / 2

            fund_score = _fundamental_score(info)

            sent_score = 50.0  # neutral default
            if include_sentiment:
                try:
                    from backend.sentiment import get_news_sentiment
                    sent = get_news_sentiment(ticker, info.get("name", ticker))
                    # Normalize [-1,+1] to [0,100]
                    sent_score = (sent.get("score", 0) + 1) / 2 * 100
                except Exception:
                    pass

            if include_sentiment:
                composite = tech_score * 0.40 + fund_score * 0.40 + sent_score * 0.20
            else:
                composite = tech_score * 0.50 + fund_score * 0.50

            last_close = df["Close"].iloc[-1]
            change_1m = _compute_1m_change(df)

            signal_map = {
                range(70, 101): "🟢 Haussier fort",
                range(55, 70): "🟡 Haussier modéré",
                range(45, 55): "⚪ Neutre",
                range(30, 45): "🟠 Baissier modéré",
                range(0, 30): "🔴 Baissier fort",
            }
            signal = "⚪ Neutre"
            for r, label in signal_map.items():
                if int(composite) in r:
                    signal = label
                    break

            rows.append({
                "Ticker": ticker,
                "Nom": info.get("name", ticker)[:30],
                "Pays": info.get("country", "N/A"),
                "Score": round(composite, 1),
                "Score Tech": round(tech_score, 1),
                "Score Fond.": round(fund_score, 1),
                "RSI": tech_result.get("rsi"),
                "Prix": round(last_close, 2),
                "Var. 1M (%)": round(change_1m, 1) if change_1m is not None else None,
                "P/E": info.get("pe_ratio"),
                "Dividende": f"{info.get('dividend_yield',0) or 0:.1%}" if info.get("dividend_yield") else "—",
                "Signal": signal,
            })

        except Exception as e:
            logger.error(f"Screener error for {ticker}: {e}")
            continue

    if not rows:
        return pd.DataFrame()

    df_result = pd.DataFrame(rows).sort_values("Score", ascending=False).reset_index(drop=True)
    return df_result
