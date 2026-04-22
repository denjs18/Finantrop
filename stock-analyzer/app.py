"""
Stock Analyzer AI — Phases 1-3 demo
Run: streamlit run app.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd

from backend.data_fetcher import get_stock_data, get_stock_info, search_ticker
from backend.indicators import calculate_indicators, calculate_technical_score, get_buy_sell_signals

st.set_page_config(
    page_title="Stock Analyzer AI",
    page_icon="📈",
    layout="wide",
)

st.title("📈 Stock Analyzer AI")
st.caption("Phases 1–3 opérationnelles : Données marché · Indicateurs techniques · Scoring")

# --- Sidebar ---
with st.sidebar:
    st.header("🔍 Recherche")
    ticker_input = st.text_input("Ticker ou nom", value="MC.PA", placeholder="MC.PA, AAPL, SAP.DE…")
    period = st.selectbox("Période", ["6mo", "1y", "2y", "5y"], index=1)
    run_btn = st.button("Analyser", type="primary", use_container_width=True)

    st.divider()
    st.caption("Prochaines phases : Prédictions Prophet · Sentiment News · Screener · Synthèse IA")

# --- Main content ---
ticker = ticker_input.strip().upper()

if run_btn or ticker:
    with st.spinner(f"Récupération des données pour {ticker}…"):
        df_raw = get_stock_data(ticker, period=period)
        info = get_stock_info(ticker)

    if df_raw is None or df_raw.empty:
        st.error(f"Impossible de récupérer les données pour **{ticker}**. Vérifiez le ticker.")
        st.stop()

    df = calculate_indicators(df_raw.copy())
    df = get_buy_sell_signals(df)
    score_data = calculate_technical_score(df)

    # --- KPI row ---
    last_close = df["Close"].iloc[-1]
    prev_close = df["Close"].iloc[-2] if len(df) > 1 else last_close
    change_pct = (last_close - prev_close) / prev_close * 100
    change_color = "normal" if change_pct >= 0 else "inverse"

    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric("🏢 Société", info.get("name", ticker)[:25])
    col2.metric("💰 Cours", f"{last_close:.2f} {info.get('currency','€')}", f"{change_pct:+.2f}%")
    col3.metric(
        "🎯 Score technique",
        f"{score_data['score']}/100",
        delta=None,
        help="Score de -100 (très baissier) à +100 (très haussier)"
    )
    col4.metric("📊 RSI (14)", f"{score_data.get('rsi') or 'N/A'}")
    col5.metric("📉 Signal MACD", score_data.get("macd_signal", "—"))

    # Verdict badge
    score = score_data["score"]
    if score >= 50:
        verdict_color, verdict_txt = "🟢", "Haussier"
    elif score >= 10:
        verdict_color, verdict_txt = "🟡", "Neutre"
    else:
        verdict_color, verdict_txt = "🔴", "Baissier"
    st.markdown(f"**Signal global : {verdict_color} {verdict_txt}** — Secteur: {info.get('sector','N/A')} · Pays: {info.get('country','N/A')}")

    st.divider()

    # --- Chart ---
    st.subheader("📊 Graphique interactif")
    show_ema = st.checkbox("EMAs (20/50/200)", value=True)
    show_bb = st.checkbox("Bollinger Bands", value=True)
    show_signals = st.checkbox("Signaux achat/vente", value=True)

    fig = make_subplots(
        rows=3, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.04,
        row_heights=[0.6, 0.2, 0.2],
        subplot_titles=("Prix & Indicateurs", "Volume", "RSI"),
    )

    # Candlesticks
    fig.add_trace(go.Candlestick(
        x=df.index,
        open=df["Open"], high=df["High"],
        low=df["Low"], close=df["Close"],
        name="OHLCV",
        increasing_line_color="#26a69a",
        decreasing_line_color="#ef5350",
        increasing_fillcolor="#26a69a",
        decreasing_fillcolor="#ef5350",
    ), row=1, col=1)

    if show_ema:
        fig.add_trace(go.Scatter(x=df.index, y=df["ema20"], name="EMA 20",
                                  line=dict(color="orange", width=1.2)), row=1, col=1)
        fig.add_trace(go.Scatter(x=df.index, y=df["ema50"], name="EMA 50",
                                  line=dict(color="#2196F3", width=1.2)), row=1, col=1)
        fig.add_trace(go.Scatter(x=df.index, y=df["ema200"], name="EMA 200",
                                  line=dict(color="#9C27B0", width=1.5)), row=1, col=1)

    if show_bb:
        fig.add_trace(go.Scatter(x=df.index, y=df["bb_upper"], name="BB Upper",
                                  line=dict(color="rgba(150,150,150,0.5)", width=0.8),
                                  showlegend=False), row=1, col=1)
        fig.add_trace(go.Scatter(x=df.index, y=df["bb_lower"], name="BB Lower",
                                  line=dict(color="rgba(150,150,150,0.5)", width=0.8),
                                  fill="tonexty", fillcolor="rgba(150,150,150,0.08)",
                                  showlegend=False), row=1, col=1)

    if show_signals and "signal" in df.columns:
        buys = df[df["signal"] == "buy"]
        sells = df[df["signal"] == "sell"]
        if not buys.empty:
            fig.add_trace(go.Scatter(
                x=buys.index, y=buys["Low"] * 0.99,
                mode="markers", name="Achat",
                marker=dict(symbol="triangle-up", size=12, color="#26a69a"),
            ), row=1, col=1)
        if not sells.empty:
            fig.add_trace(go.Scatter(
                x=sells.index, y=sells["High"] * 1.01,
                mode="markers", name="Vente",
                marker=dict(symbol="triangle-down", size=12, color="#ef5350"),
            ), row=1, col=1)

    # Volume
    colors = ["#26a69a" if c >= o else "#ef5350"
              for c, o in zip(df["Close"], df["Open"])]
    fig.add_trace(go.Bar(x=df.index, y=df["Volume"], name="Volume",
                          marker_color=colors, showlegend=False), row=2, col=1)
    fig.add_trace(go.Scatter(x=df.index, y=df["vol_ma20"], name="Vol MA20",
                              line=dict(color="white", width=1), showlegend=False), row=2, col=1)

    # RSI
    fig.add_trace(go.Scatter(x=df.index, y=df["rsi"], name="RSI",
                              line=dict(color="#FFD700", width=1.5)), row=3, col=1)
    fig.add_hline(y=70, line_dash="dash", line_color="red", opacity=0.5, row=3, col=1)
    fig.add_hline(y=30, line_dash="dash", line_color="green", opacity=0.5, row=3, col=1)

    fig.update_layout(
        height=700,
        template="plotly_dark",
        xaxis_rangeslider_visible=False,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=10, r=10, t=60, b=10),
    )
    fig.update_yaxes(title_text="Prix", row=1, col=1)
    fig.update_yaxes(title_text="Volume", row=2, col=1)
    fig.update_yaxes(title_text="RSI", row=3, col=1, range=[0, 100])

    st.plotly_chart(fig, use_container_width=True)

    # --- Score details ---
    st.divider()
    col_l, col_r = st.columns(2)

    with col_l:
        st.subheader("🎯 Détail du score technique")
        score_bar_val = (score + 100) / 2
        bar_color = "#26a69a" if score >= 0 else "#ef5350"
        st.progress(int(score_bar_val) / 100, text=f"Score : {score}/100")

        details = score_data.get("details", {})
        if details:
            detail_df = pd.DataFrame([
                {"Signal": k.replace("_", " ").title(), "Points": v}
                for k, v in details.items()
            ])
            detail_df = detail_df.sort_values("Points", ascending=False)
            st.dataframe(detail_df, hide_index=True, use_container_width=True)

    with col_r:
        st.subheader("📋 Fondamentaux")
        fundamentals = {
            "P/E (trailing)": info.get("pe_ratio"),
            "P/E (forward)": info.get("forward_pe"),
            "PEG": info.get("peg_ratio"),
            "P/Book": info.get("price_to_book"),
            "Dividende": f"{info.get('dividend_yield', 0) or 0:.1%}" if info.get("dividend_yield") else "N/A",
            "Croissance BPA": f"{info.get('earnings_growth', 0) or 0:.1%}" if info.get("earnings_growth") else "N/A",
            "Croissance CA": f"{info.get('revenue_growth', 0) or 0:.1%}" if info.get("revenue_growth") else "N/A",
            "Beta": info.get("beta"),
            "Cap. boursière": f"{info.get('market_cap', 0) or 0:,.0f} {info.get('currency','€')}",
            "52S Haut": info.get("52w_high"),
            "52S Bas": info.get("52w_low"),
        }
        fund_df = pd.DataFrame([
            {"Indicateur": k, "Valeur": str(v) if v is not None else "N/A"}
            for k, v in fundamentals.items()
        ])
        st.dataframe(fund_df, hide_index=True, use_container_width=True)

    # --- Raw indicators table ---
    with st.expander("📊 Indicateurs — 10 dernières lignes"):
        cols_show = [c for c in ["Close", "ema20", "ema50", "ema200", "rsi",
                                   "macd", "macd_signal", "bb_upper", "bb_lower",
                                   "atr", "adx", "stoch_k"] if c in df.columns]
        st.dataframe(df[cols_show].tail(10).round(2), use_container_width=True)
