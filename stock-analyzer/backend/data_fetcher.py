import logging
from typing import Optional
import pandas as pd
import yfinance as yf
import requests
from bs4 import BeautifulSoup

from config import CAC40_TICKERS, EUROSTOXX50_TICKERS
from backend.database import cache_get, cache_set

logger = logging.getLogger(__name__)


def get_stock_data(ticker: str, period: str = "1y") -> Optional[pd.DataFrame]:
    """Fetch OHLCV data for a ticker. Returns None on failure."""
    cache_key = f"ohlcv:{ticker}:{period}"
    cached = cache_get(cache_key)
    if cached:
        df = pd.DataFrame(cached)
        df.index = pd.to_datetime(df.index)
        return df

    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=period, auto_adjust=True)
        if df.empty:
            logger.warning(f"No data returned for {ticker}")
            return None
        df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
        df.index = df.index.tz_localize(None) if df.index.tz else df.index
        df.index.name = "Date"
        # Convert index to str for JSON serialization
        df_serializable = df.copy()
        df_serializable.index = df_serializable.index.strftime("%Y-%m-%d")
        cache_set(cache_key, df_serializable.to_dict(), ttl_minutes=60)
        return df
    except Exception as e:
        logger.error(f"Failed to fetch data for {ticker}: {e}")
        return None


def get_stock_info(ticker: str) -> dict:
    """Fetch fundamental info for a ticker. Returns empty dict on failure."""
    cache_key = f"info:{ticker}"
    cached = cache_get(cache_key)
    if cached:
        return cached

    try:
        stock = yf.Ticker(ticker)
        info = stock.info

        result = {
            "ticker": ticker,
            "name": info.get("longName") or info.get("shortName") or ticker,
            "sector": info.get("sector", "N/A"),
            "industry": info.get("industry", "N/A"),
            "country": info.get("country", "N/A"),
            "currency": info.get("currency", "EUR"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "peg_ratio": info.get("pegRatio"),
            "price_to_book": info.get("priceToBook"),
            "dividend_yield": info.get("dividendYield"),
            "earnings_growth": info.get("earningsGrowth"),
            "revenue_growth": info.get("revenueGrowth"),
            "current_price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "52w_high": info.get("fiftyTwoWeekHigh"),
            "52w_low": info.get("fiftyTwoWeekLow"),
            "avg_volume": info.get("averageVolume"),
            "beta": info.get("beta"),
            "description": (info.get("longBusinessSummary") or "")[:500],
        }
        cache_set(cache_key, result, ttl_minutes=120)
        return result
    except Exception as e:
        logger.error(f"Failed to fetch info for {ticker}: {e}")
        return {"ticker": ticker, "name": ticker, "sector": "N/A", "country": "N/A"}


def get_multiple_stocks(tickers: list[str], period: str = "1y") -> dict[str, pd.DataFrame]:
    """Batch fetch multiple tickers. Skips failures silently."""
    results = {}
    try:
        raw = yf.download(
            tickers, period=period, auto_adjust=True,
            group_by="ticker", progress=False, threads=True
        )
        if len(tickers) == 1:
            ticker = tickers[0]
            if not raw.empty:
                results[ticker] = raw[["Open", "High", "Low", "Close", "Volume"]].copy()
        else:
            for ticker in tickers:
                try:
                    df = raw[ticker][["Open", "High", "Low", "Close", "Volume"]].dropna()
                    if not df.empty:
                        results[ticker] = df
                except Exception:
                    pass
    except Exception as e:
        logger.error(f"Batch download failed: {e}")
        for ticker in tickers:
            df = get_stock_data(ticker, period)
            if df is not None:
                results[ticker] = df
    return results


def get_cac40_tickers() -> list[str]:
    return CAC40_TICKERS.copy()


def get_eurostoxx50_tickers() -> list[str]:
    return EUROSTOXX50_TICKERS.copy()


def get_sp500_tickers() -> list[str]:
    """Scrape S&P 500 tickers from Wikipedia."""
    cache_key = "tickers:sp500"
    cached = cache_get(cache_key)
    if cached:
        return cached

    try:
        url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
        resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(resp.text, "lxml")
        table = soup.find("table", {"id": "constituents"})
        tickers = [
            row.find_all("td")[0].text.strip().replace(".", "-")
            for row in table.find_all("tr")[1:]
        ]
        cache_set(cache_key, tickers, ttl_minutes=1440)
        return tickers
    except Exception as e:
        logger.error(f"Failed to scrape S&P 500 tickers: {e}")
        return []


def search_ticker(query: str) -> list[dict]:
    """Approximate search by name or ticker."""
    try:
        import yfinance as yf
        ticker_obj = yf.Ticker(query.upper())
        info = ticker_obj.info
        if info.get("regularMarketPrice") or info.get("currentPrice"):
            return [{
                "ticker": query.upper(),
                "name": info.get("longName") or info.get("shortName") or query.upper(),
                "exchange": info.get("exchange", ""),
                "type": info.get("quoteType", ""),
            }]
    except Exception:
        pass

    try:
        url = f"https://query1.finance.yahoo.com/v1/finance/search?q={query}&lang=en-US&region=US&quotesCount=6"
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(url, headers=headers, timeout=5)
        data = resp.json()
        results = []
        for quote in data.get("quotes", []):
            results.append({
                "ticker": quote.get("symbol", ""),
                "name": quote.get("longname") or quote.get("shortname", ""),
                "exchange": quote.get("exchDisp", ""),
                "type": quote.get("quoteType", ""),
            })
        return results[:6]
    except Exception as e:
        logger.error(f"Ticker search failed for '{query}': {e}")
        return []
