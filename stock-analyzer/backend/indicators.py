import logging
import pandas as pd
import numpy as np
try:
    import pandas_ta as ta
    HAS_PANDAS_TA = True
except ImportError:
    HAS_PANDAS_TA = False

from config import TECHNICAL_SCORE_WEIGHTS

logger = logging.getLogger(__name__)


def _ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False).mean()


def _rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate all technical indicators on an OHLCV DataFrame.
    Adds columns in-place and returns the enriched DataFrame.
    """
    if df is None or df.empty or len(df) < 30:
        return df

    close = df["Close"]
    high = df["High"]
    low = df["Low"]
    volume = df["Volume"]

    # --- Trend ---
    df["ema20"] = _ema(close, 20)
    df["ema50"] = _ema(close, 50)
    df["ema200"] = _ema(close, 200)

    # MACD (12, 26, 9)
    ema12 = _ema(close, 12)
    ema26 = _ema(close, 26)
    df["macd"] = ema12 - ema26
    df["macd_signal"] = _ema(df["macd"], 9)
    df["macd_hist"] = df["macd"] - df["macd_signal"]

    # ADX (14)
    if HAS_PANDAS_TA:
        adx_df = ta.adx(high, low, close, length=14)
        if adx_df is not None and not adx_df.empty:
            df["adx"] = adx_df.iloc[:, 0]
        else:
            df["adx"] = _fallback_adx(high, low, close)
    else:
        df["adx"] = _fallback_adx(high, low, close)

    # --- Momentum ---
    df["rsi"] = _rsi(close, 14)

    # Stochastic (14, 3, 3)
    low14 = low.rolling(14).min()
    high14 = high.rolling(14).max()
    k = 100 * (close - low14) / (high14 - low14 + 1e-10)
    df["stoch_k"] = k.rolling(3).mean()
    df["stoch_d"] = df["stoch_k"].rolling(3).mean()

    # CCI (20)
    tp = (high + low + close) / 3
    sma_tp = tp.rolling(20).mean()
    mad = tp.rolling(20).apply(lambda x: np.abs(x - x.mean()).mean(), raw=True)
    df["cci"] = (tp - sma_tp) / (0.015 * mad + 1e-10)

    # --- Volatility ---
    sma20 = close.rolling(20).mean()
    std20 = close.rolling(20).std()
    df["bb_upper"] = sma20 + 2 * std20
    df["bb_middle"] = sma20
    df["bb_lower"] = sma20 - 2 * std20

    # ATR (14)
    tr1 = high - low
    tr2 = (high - close.shift(1)).abs()
    tr3 = (low - close.shift(1)).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    df["atr"] = tr.ewm(span=14, adjust=False).mean()

    # --- Volume ---
    df["obv"] = (np.sign(close.diff()) * volume).fillna(0).cumsum()
    df["vol_ma20"] = volume.rolling(20).mean()
    df["vol_ratio"] = volume / df["vol_ma20"].replace(0, np.nan)

    return df


def _fallback_adx(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """Manual ADX calculation when pandas-ta is unavailable."""
    up_move = high.diff()
    down_move = -low.diff()
    plus_dm = up_move.where((up_move > down_move) & (up_move > 0), 0.0)
    minus_dm = down_move.where((down_move > up_move) & (down_move > 0), 0.0)

    tr1 = high - low
    tr2 = (high - close.shift(1)).abs()
    tr3 = (low - close.shift(1)).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)

    atr = tr.ewm(span=period, adjust=False).mean()
    plus_di = 100 * plus_dm.ewm(span=period, adjust=False).mean() / atr.replace(0, np.nan)
    minus_di = 100 * minus_dm.ewm(span=period, adjust=False).mean() / atr.replace(0, np.nan)
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
    return dx.ewm(span=period, adjust=False).mean()


def calculate_technical_score(df: pd.DataFrame) -> dict:
    """
    Compute a technical score from -100 to +100 and return a detailed breakdown.
    Input: enriched OHLCV DataFrame (output of calculate_indicators).
    """
    if df is None or df.empty:
        return {"score": 0, "details": {}}

    last = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else last

    score = 0
    details = {}

    # RSI
    rsi = last.get("rsi", 50)
    if pd.notna(rsi):
        if rsi < 30:
            pts = TECHNICAL_SCORE_WEIGHTS["rsi_oversold"]
            score += pts
            details["rsi_oversold"] = pts
        elif rsi > 70:
            pts = TECHNICAL_SCORE_WEIGHTS["rsi_overbought"]
            score += pts
            details["rsi_overbought"] = pts

    # Price vs EMA200
    close = last["Close"]
    ema200 = last.get("ema200", np.nan)
    if pd.notna(ema200):
        if close > ema200:
            pts = TECHNICAL_SCORE_WEIGHTS["above_ema200"]
            score += pts
            details["above_ema200"] = pts
        else:
            pts = TECHNICAL_SCORE_WEIGHTS["below_ema200"]
            score += pts
            details["below_ema200"] = pts

    # MACD crossover
    macd = last.get("macd", np.nan)
    macd_sig = last.get("macd_signal", np.nan)
    prev_macd = prev.get("macd", np.nan)
    prev_macd_sig = prev.get("macd_signal", np.nan)
    if all(pd.notna(v) for v in [macd, macd_sig, prev_macd, prev_macd_sig]):
        bullish_cross = (prev_macd < prev_macd_sig) and (macd > macd_sig)
        bearish_cross = (prev_macd > prev_macd_sig) and (macd < macd_sig)
        if bullish_cross:
            pts = TECHNICAL_SCORE_WEIGHTS["macd_bullish"]
            score += pts
            details["macd_bullish_cross"] = pts
        elif bearish_cross:
            pts = TECHNICAL_SCORE_WEIGHTS["macd_bearish"]
            score += pts
            details["macd_bearish_cross"] = pts
        elif macd > macd_sig:
            score += 7
            details["macd_above_signal"] = 7
        else:
            score -= 7
            details["macd_below_signal"] = -7

    # Volume vs 20d average
    vol_ratio = last.get("vol_ratio", np.nan)
    if pd.notna(vol_ratio) and vol_ratio > 2:
        if pd.notna(ema200) and close > ema200:
            pts = TECHNICAL_SCORE_WEIGHTS["high_volume_bull"]
            score += pts
            details["high_volume_bullish"] = pts
        else:
            score -= 5
            details["high_volume_bearish"] = -5

    # ADX (trend strength)
    adx = last.get("adx", np.nan)
    if pd.notna(adx) and adx > 25:
        pts = TECHNICAL_SCORE_WEIGHTS["strong_trend"]
        score += pts
        details["strong_trend_adx"] = pts

    # Bollinger Bands proximity
    bb_lower = last.get("bb_lower", np.nan)
    bb_upper = last.get("bb_upper", np.nan)
    bb_mid = last.get("bb_middle", np.nan)
    if all(pd.notna(v) for v in [bb_lower, bb_upper, bb_mid]):
        bb_width = bb_upper - bb_lower
        if bb_width > 0:
            pct_b = (close - bb_lower) / bb_width
            if pct_b < 0.1:
                pts = TECHNICAL_SCORE_WEIGHTS["near_bb_lower"]
                score += pts
                details["near_bb_support"] = pts
            elif pct_b > 0.9:
                pts = TECHNICAL_SCORE_WEIGHTS["near_bb_upper"]
                score += pts
                details["near_bb_resistance"] = pts

    # Stochastic
    stoch_k = last.get("stoch_k", np.nan)
    if pd.notna(stoch_k):
        if stoch_k < 20:
            pts = TECHNICAL_SCORE_WEIGHTS["stoch_oversold"]
            score += pts
            details["stoch_oversold"] = pts
        elif stoch_k > 80:
            pts = TECHNICAL_SCORE_WEIGHTS["stoch_overbought"]
            score += pts
            details["stoch_overbought"] = pts

    # EMA alignment (short > mid > long = bullish)
    ema20 = last.get("ema20", np.nan)
    ema50 = last.get("ema50", np.nan)
    if all(pd.notna(v) for v in [ema20, ema50, ema200]):
        if ema20 > ema50 > ema200:
            score += 10
            details["ema_alignment_bull"] = 10
        elif ema20 < ema50 < ema200:
            score -= 10
            details["ema_alignment_bear"] = -10

    # Clamp to [-100, +100]
    score = max(-100, min(100, score))

    # Human-readable MACD and trend signals
    macd_label = "Haussier" if macd_sig is not None and pd.notna(macd) and macd > macd_sig else "Baissier"
    above_ema200 = pd.notna(ema200) and close > ema200

    return {
        "score": round(score),
        "details": details,
        "rsi": round(float(rsi), 1) if pd.notna(rsi) else None,
        "adx": round(float(adx), 1) if pd.notna(adx) else None,
        "atr": round(float(last.get("atr", 0)), 2),
        "macd_signal": macd_label,
        "above_ema200": above_ema200,
        "stoch_k": round(float(stoch_k), 1) if pd.notna(stoch_k) else None,
        "cci": round(float(last.get("cci", 0)), 1),
        "vol_ratio": round(float(vol_ratio), 2) if pd.notna(vol_ratio) else None,
        "bb_pct": round(pct_b * 100, 1) if all(pd.notna(v) for v in [bb_lower, bb_upper]) and bb_width > 0 else None,
    }


def get_buy_sell_signals(df: pd.DataFrame) -> pd.DataFrame:
    """Return a DataFrame with 'signal' column: 'buy', 'sell', or None."""
    if df is None or df.empty:
        return df

    signals = pd.Series(index=df.index, dtype=object)
    rsi = df.get("rsi", pd.Series(dtype=float))
    macd = df.get("macd", pd.Series(dtype=float))
    macd_sig = df.get("macd_signal", pd.Series(dtype=float))

    for i in range(1, len(df)):
        prev_idx = df.index[i - 1]
        curr_idx = df.index[i]
        # MACD bullish cross + RSI not overbought
        if (pd.notna(macd.get(prev_idx)) and pd.notna(macd_sig.get(prev_idx))
                and macd.get(prev_idx) < macd_sig.get(prev_idx)
                and macd.get(curr_idx) > macd_sig.get(curr_idx)
                and rsi.get(curr_idx, 50) < 70):
            signals[curr_idx] = "buy"
        # MACD bearish cross + RSI not oversold
        elif (pd.notna(macd.get(prev_idx)) and pd.notna(macd_sig.get(prev_idx))
              and macd.get(prev_idx) > macd_sig.get(prev_idx)
              and macd.get(curr_idx) < macd_sig.get(curr_idx)
              and rsi.get(curr_idx, 50) > 30):
            signals[curr_idx] = "sell"

    df = df.copy()
    df["signal"] = signals
    return df
