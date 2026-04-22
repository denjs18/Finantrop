# Phase 4 — à implémenter après validation phases 1-3
from typing import Optional
import pandas as pd


def generate_prediction(ticker: str, df: pd.DataFrame, horizon_days: int = 30) -> Optional[dict]:
    """
    Placeholder — implemented in Phase 4.
    Will use Prophet to generate price predictions with uncertainty cone.
    """
    raise NotImplementedError("Phase 4 not yet implemented")
