import os

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "à_renseigner")

CACHE_DURATION_MINUTES = 60
DEFAULT_PREDICTION_HORIZON = 30

CAC40_TICKERS = [
    "AI.PA", "AIR.PA", "ALO.PA", "MT.AS", "CS.PA", "BNP.PA", "EN.PA",
    "CAP.PA", "CA.PA", "ACA.PA", "BN.PA", "DSY.PA", "ENGI.PA", "EL.PA",
    "ERF.PA", "RMS.PA", "KER.PA", "LR.PA", "OR.PA", "MC.PA", "ML.PA",
    "ORA.PA", "RI.PA", "PUB.PA", "RNO.PA", "SAF.PA", "SGO.PA", "SAN.PA",
    "SU.PA", "GLE.PA", "STLAM.MI", "STM.PA", "TEP.PA", "HO.PA", "TTE.PA",
    "URW.AS", "VIE.PA", "DG.PA", "WLN.PA", "FR.PA",
]

EUROSTOXX50_TICKERS = [
    "ABI.BR", "ADYEN.AS", "AD.AS", "ASML.AS", "AIR.PA", "ALV.DE",
    "MUV2.DE", "BAYN.DE", "BMW.DE", "BNP.PA", "CRH.IE", "CS.PA",
    "DTE.DE", "ENEL.MI", "ENI.MI", "EL.PA", "FLTR.IE", "IBE.MC",
    "IFX.DE", "INGA.AS", "ITX.MC", "ISP.MI", "KER.PA", "KNEBV.HE",
    "OR.PA", "MC.PA", "MBG.DE", "MRK.DE", "MT.AS", "NG.L",
    "NOKIA.HE", "ORA.PA", "PHIA.AS", "PRX.AS", "RMS.PA", "SAF.PA",
    "SAN.MC", "SAN.PA", "SAP.DE", "SGO.PA", "SIE.DE", "GLE.PA",
    "STLAM.MI", "TEF.MC", "TTE.PA", "UCG.MI", "VOW3.DE", "VIV.PA",
    "DG.PA", "ZAL.DE",
]

SCREENER_UNIVERSES = {
    "cac40": CAC40_TICKERS,
    "eurostoxx50": EUROSTOXX50_TICKERS,
    "sp500": "scrape_wikipedia",
}

DB_PATH = "stock_analyzer.db"

TECHNICAL_SCORE_WEIGHTS = {
    "rsi_oversold": 15,
    "rsi_overbought": -15,
    "above_ema200": 20,
    "below_ema200": -20,
    "macd_bullish": 15,
    "macd_bearish": -15,
    "high_volume_bull": 10,
    "strong_trend": 10,
    "near_bb_lower": 10,
    "near_bb_upper": -10,
    "stoch_oversold": 10,
    "stoch_overbought": -10,
}
