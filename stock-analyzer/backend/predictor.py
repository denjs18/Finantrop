import logging
from typing import Optional
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


def generate_prediction(ticker: str, df: pd.DataFrame, horizon_days: int = 30) -> Optional[dict]:
    """
    Generate price prediction using Prophet with uncertainty cone.
    Requires at least 6 months of daily data.
    Returns dict with forecast DataFrame and scenario targets.
    """
    try:
        from prophet import Prophet
    except ImportError:
        logger.error("Prophet not installed. Run: pip install prophet")
        return None

    if df is None or len(df) < 120:
        logger.warning(f"Not enough data for {ticker} ({len(df) if df is not None else 0} rows)")
        return None

    try:
        prophet_df = pd.DataFrame({
            "ds": df.index.tz_localize(None) if df.index.tz else df.index,
            "y": df["Close"].values,
        })

        model = Prophet(
            seasonality_mode="multiplicative",
            changepoint_prior_scale=0.05,
            seasonality_prior_scale=10,
            daily_seasonality=False,
            weekly_seasonality=True,
            yearly_seasonality=True,
            interval_width=0.80,
        )
        model.add_seasonality(name="monthly", period=30.5, fourier_order=5)

        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model.fit(prophet_df)

        future = model.make_future_dataframe(periods=horizon_days, freq="B")
        forecast = model.predict(future)

        # Separate historical and prediction parts
        last_hist_date = prophet_df["ds"].max()
        pred_df = forecast[forecast["ds"] > last_hist_date].copy()
        hist_df = forecast[forecast["ds"] <= last_hist_date].copy()

        last_price = df["Close"].iloc[-1]
        price_target = float(pred_df["yhat"].iloc[-1]) if not pred_df.empty else last_price
        bull_case = float(pred_df["yhat_upper"].iloc[-1] * 1.05) if not pred_df.empty else last_price
        bear_case = float(pred_df["yhat_lower"].iloc[-1] * 0.95) if not pred_df.empty else last_price

        upside_pct = (price_target - last_price) / last_price * 100

        # Confidence: tighter interval relative to price = higher confidence
        if not pred_df.empty:
            avg_interval = (pred_df["yhat_upper"] - pred_df["yhat_lower"]).mean()
            avg_price = pred_df["yhat"].mean()
            relative_uncertainty = avg_interval / (avg_price + 1e-10)
            confidence_score = max(0, min(100, 100 - relative_uncertainty * 200))
        else:
            confidence_score = 0

        return {
            "ticker": ticker,
            "horizon_days": horizon_days,
            "last_price": last_price,
            "price_target": price_target,
            "bull_case": bull_case,
            "bear_case": bear_case,
            "upside_pct": upside_pct,
            "confidence_score": confidence_score,
            "forecast_full": forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]],
            "forecast_hist": hist_df[["ds", "yhat", "yhat_lower", "yhat_upper"]],
            "forecast_pred": pred_df[["ds", "yhat", "yhat_lower", "yhat_upper"]],
        }

    except Exception as e:
        logger.error(f"Prophet prediction failed for {ticker}: {e}")
        return None
