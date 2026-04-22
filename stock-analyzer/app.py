"""
Stock Analyzer AI — Application complète (phases 1-8)
Run: streamlit run app.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np

from backend.data_fetcher import get_stock_data, get_stock_info, search_ticker
from backend.indicators import calculate_indicators, calculate_technical_score, get_buy_sell_signals
from backend.database import watchlist_add, watchlist_remove, watchlist_get

st.set_page_config(
    page_title="Stock Analyzer AI",
    page_icon="📈",
    layout="wide",
)

# ─── CSS minimal ───
st.markdown("""
<style>
.verdict-acheter { background:#1b5e20; color:white; padding:8px 20px; border-radius:8px; font-size:1.3em; font-weight:bold; }
.verdict-surveiller { background:#e65100; color:white; padding:8px 20px; border-radius:8px; font-size:1.3em; font-weight:bold; }
.verdict-eviter { background:#b71c1c; color:white; padding:8px 20px; border-radius:8px; font-size:1.3em; font-weight:bold; }
.stProgress > div > div { height: 12px; border-radius: 6px; }
</style>
""", unsafe_allow_html=True)


def render_stock_chart(df: pd.DataFrame, prediction: dict = None, show_ema: bool = True,
                       show_bb: bool = True, show_signals: bool = True) -> go.Figure:
    """Build the full interactive Plotly chart."""

    fig = make_subplots(
        rows=3, cols=1, shared_xaxes=True,
        vertical_spacing=0.03,
        row_heights=[0.60, 0.20, 0.20],
        subplot_titles=("Prix & Indicateurs", "Volume", "RSI (14)"),
    )

    # ── Candlesticks ──
    fig.add_trace(go.Candlestick(
        x=df.index, open=df["Open"], high=df["High"],
        low=df["Low"], close=df["Close"], name="OHLCV",
        increasing_line_color="#26a69a", decreasing_line_color="#ef5350",
        increasing_fillcolor="#26a69a", decreasing_fillcolor="#ef5350",
    ), row=1, col=1)

    if show_ema:
        for col_name, color, width in [("ema20","#FF9800",1.2), ("ema50","#2196F3",1.2), ("ema200","#9C27B0",1.8)]:
            if col_name in df.columns:
                fig.add_trace(go.Scatter(
                    x=df.index, y=df[col_name],
                    name=col_name.upper().replace("EMA", "EMA "),
                    line=dict(color=color, width=width),
                ), row=1, col=1)

    if show_bb and "bb_upper" in df.columns:
        fig.add_trace(go.Scatter(
            x=df.index, y=df["bb_upper"], name="BB Upper",
            line=dict(color="rgba(158,158,158,0.5)", width=0.8), showlegend=False,
        ), row=1, col=1)
        fig.add_trace(go.Scatter(
            x=df.index, y=df["bb_lower"], name="BB Lower",
            line=dict(color="rgba(158,158,158,0.5)", width=0.8),
            fill="tonexty", fillcolor="rgba(158,158,158,0.07)", showlegend=False,
        ), row=1, col=1)

    if show_signals and "signal" in df.columns:
        buys = df[df["signal"] == "buy"]
        sells = df[df["signal"] == "sell"]
        if not buys.empty:
            fig.add_trace(go.Scatter(
                x=buys.index, y=buys["Low"] * 0.988, mode="markers", name="Achat ▲",
                marker=dict(symbol="triangle-up", size=13, color="#26a69a",
                            line=dict(color="white", width=0.5)),
            ), row=1, col=1)
        if not sells.empty:
            fig.add_trace(go.Scatter(
                x=sells.index, y=sells["High"] * 1.012, mode="markers", name="Vente ▼",
                marker=dict(symbol="triangle-down", size=13, color="#ef5350",
                            line=dict(color="white", width=0.5)),
            ), row=1, col=1)

    # ── Prediction zone ──
    if prediction and prediction.get("forecast_pred") is not None:
        pred_df = prediction["forecast_pred"]
        if not pred_df.empty:
            today = df.index[-1]

            # Gray background for prediction zone
            fig.add_vrect(
                x0=today, x1=pred_df["ds"].max(),
                fillcolor="rgba(100,100,100,0.08)",
                layer="below", line_width=0, row=1, col=1,
            )

            # Vertical "today" separator
            fig.add_vline(x=today, line_dash="dot", line_color="rgba(200,200,200,0.5)",
                          line_width=1.5, row=1, col=1)

            # Bull case fill (green)
            fig.add_trace(go.Scatter(
                x=pred_df["ds"], y=pred_df["yhat_upper"] * 1.05,
                name="Bull case", line=dict(color="rgba(38,166,154,0)", width=0),
                showlegend=False,
            ), row=1, col=1)
            fig.add_trace(go.Scatter(
                x=pred_df["ds"], y=pred_df["yhat"],
                name="Base case",
                line=dict(color="#29B6F6", width=2, dash="dot"),
                fill="tonexty", fillcolor="rgba(38,166,154,0.12)",
            ), row=1, col=1)

            # Bear case fill (red)
            fig.add_trace(go.Scatter(
                x=pred_df["ds"], y=pred_df["yhat_lower"] * 0.95,
                name="Bear case",
                line=dict(color="#ef5350", width=1, dash="dot"),
                fill="tonexty", fillcolor="rgba(239,83,80,0.10)",
            ), row=1, col=1)

            # Price target annotation
            target = prediction["price_target"]
            upside = prediction["upside_pct"]
            fig.add_annotation(
                x=pred_df["ds"].iloc[-1], y=target,
                text=f"🎯 {target:.1f} ({upside:+.1f}%)",
                showarrow=True, arrowhead=2,
                font=dict(color="white", size=11),
                bgcolor="#29B6F6", bordercolor="#29B6F6", borderwidth=1,
                row=1, col=1,
            )

    # ── Volume ──
    vol_colors = ["#26a69a" if c >= o else "#ef5350"
                  for c, o in zip(df["Close"], df["Open"])]
    fig.add_trace(go.Bar(x=df.index, y=df["Volume"], name="Volume",
                          marker_color=vol_colors, showlegend=False), row=2, col=1)
    if "vol_ma20" in df.columns:
        fig.add_trace(go.Scatter(x=df.index, y=df["vol_ma20"],
                                  line=dict(color="rgba(255,255,255,0.6)", width=1),
                                  name="Vol MA20", showlegend=False), row=2, col=1)

    # ── RSI ──
    if "rsi" in df.columns:
        fig.add_trace(go.Scatter(x=df.index, y=df["rsi"], name="RSI",
                                  line=dict(color="#FFD700", width=1.5)), row=3, col=1)
        fig.add_hrect(y0=70, y1=100, fillcolor="rgba(239,83,80,0.08)", layer="below",
                       line_width=0, row=3, col=1)
        fig.add_hrect(y0=0, y1=30, fillcolor="rgba(38,166,154,0.08)", layer="below",
                       line_width=0, row=3, col=1)
        fig.add_hline(y=70, line_dash="dash", line_color="rgba(239,83,80,0.5)", row=3, col=1)
        fig.add_hline(y=30, line_dash="dash", line_color="rgba(38,166,154,0.5)", row=3, col=1)

    fig.update_layout(
        height=720,
        template="plotly_dark",
        xaxis_rangeslider_visible=False,
        paper_bgcolor="#0e1117",
        plot_bgcolor="#0e1117",
        legend=dict(orientation="h", yanchor="bottom", y=1.01, xanchor="right", x=1,
                    font=dict(size=11)),
        margin=dict(l=10, r=10, t=50, b=10),
    )
    fig.update_yaxes(gridcolor="rgba(255,255,255,0.06)")
    fig.update_xaxes(gridcolor="rgba(255,255,255,0.04)", showgrid=False)
    fig.update_yaxes(title_text="Prix", row=1, col=1)
    fig.update_yaxes(title_text="Volume", row=2, col=1)
    fig.update_yaxes(title_text="RSI", row=3, col=1, range=[0, 100])

    return fig


def page_screener():
    st.header("🔍 Screener d'opportunités")
    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        universe = st.selectbox("Univers", ["cac40", "eurostoxx50", "sp500"],
                                format_func=lambda x: {"cac40":"🇫🇷 CAC 40","eurostoxx50":"🇪🇺 Euro Stoxx 50","sp500":"🌍 S&P 500"}[x])
    with col2:
        include_sent = st.checkbox("Inclure sentiment IA", value=False,
                                   help="Nécessite ANTHROPIC_API_KEY")
    with col3:
        run = st.button("🚀 Lancer l'analyse", type="primary", use_container_width=True)

    if run:
        from backend.screener import run_screener
        progress_bar = st.progress(0, text="Initialisation…")
        status = st.empty()

        def update_progress(pct, msg):
            progress_bar.progress(pct, text=msg)

        with st.spinner("Analyse en cours…"):
            results = run_screener(universe, include_sentiment=include_sent,
                                   progress_callback=update_progress)
        progress_bar.progress(1.0, text="Terminé ✅")

        if results.empty:
            st.warning("Aucun résultat. Vérifiez la connexion internet.")
            return

        st.success(f"✅ {len(results)} actions analysées — top 10 ci-dessous")

        top10 = results.head(10)

        def _color_score(val):
            if val >= 65: return "background-color:#1b5e20;color:white"
            elif val >= 50: return "background-color:#e65100;color:white"
            else: return "background-color:#b71c1c;color:white"

        styled = (
            top10.style
            .applymap(_color_score, subset=["Score"])
            .format({"Score":"{:.1f}", "Score Tech":"{:.1f}", "Score Fond.":"{:.1f}",
                     "RSI":"{:.1f}", "Prix":"{:.2f}", "Var. 1M (%)":"{:+.1f}"}, na_rep="—")
        )
        st.dataframe(styled, use_container_width=True, hide_index=True)

        st.subheader("Classement complet")
        st.dataframe(results, use_container_width=True, hide_index=True)

        csv = results.to_csv(index=False).encode("utf-8")
        st.download_button("📥 Exporter CSV", csv,
                           file_name=f"screener_{universe}.csv", mime="text/csv")


def page_fiche(ticker: str, period: str = "1y"):
    with st.spinner(f"Chargement de {ticker}…"):
        df_raw = get_stock_data(ticker, period=period)
        info = get_stock_info(ticker)

    if df_raw is None or df_raw.empty:
        st.error(f"Impossible de récupérer les données pour **{ticker}**.")
        return

    df = calculate_indicators(df_raw.copy())
    df = get_buy_sell_signals(df)
    score_data = calculate_technical_score(df)

    last_close = df["Close"].iloc[-1]
    prev_close = df["Close"].iloc[-2] if len(df) > 1 else last_close
    change_pct = (last_close - prev_close) / prev_close * 100

    # ── Header ──
    col_name, col_price, col_score, col_rsi, col_macd, col_wl = st.columns([3,2,1,1,1,1])
    col_name.metric("🏢", f"{info.get('name', ticker)[:28]}")
    col_price.metric("Cours", f"{last_close:.2f} {info.get('currency','')}", f"{change_pct:+.2f}%")
    col_score.metric("Score", f"{score_data['score']}/100")
    col_rsi.metric("RSI", f"{score_data.get('rsi') or '—'}")
    col_macd.metric("MACD", score_data.get("macd_signal","—"))
    if col_wl.button("⭐ Watchlist"):
        watchlist_add(ticker, info.get("name",""))
        st.toast(f"{ticker} ajouté à la watchlist")

    # ── Chart options ──
    c1, c2, c3, c4 = st.columns(4)
    show_ema = c1.checkbox("EMAs", value=True)
    show_bb = c2.checkbox("Bollinger", value=True)
    show_sig = c3.checkbox("Signaux", value=True)
    run_pred = c4.checkbox("Prédiction Prophet", value=False, help="Calcul ~10-15 sec")

    # ── Prediction ──
    prediction = None
    if run_pred:
        with st.spinner("Entraînement Prophet…"):
            from backend.predictor import generate_prediction
            df_2y = get_stock_data(ticker, period="2y")
            if df_2y is not None:
                prediction = generate_prediction(ticker, df_2y)
        if prediction:
            p1, p2, p3, p4 = st.columns(4)
            p1.metric("🎯 Cible 30j", f"{prediction['price_target']:.2f}")
            p2.metric("📈 Upside", f"{prediction['upside_pct']:+.1f}%")
            p3.metric("🐂 Bull case", f"{prediction['bull_case']:.2f}")
            p4.metric("🐻 Bear case", f"{prediction['bear_case']:.2f}")

    # ── Chart ──
    fig = render_stock_chart(df, prediction=prediction,
                              show_ema=show_ema, show_bb=show_bb, show_signals=show_sig)
    st.plotly_chart(fig, use_container_width=True)

    # ── Score + Fundamentals ──
    st.divider()
    col_l, col_r = st.columns(2)

    with col_l:
        st.subheader("🎯 Score technique")
        score = score_data["score"]
        score_norm = int((score + 100) / 2)
        st.progress(score_norm / 100, text=f"{score}/100")
        details = score_data.get("details", {})
        if details:
            det_df = pd.DataFrame([
                {"Signal": k.replace("_"," ").title(), "Points": v}
                for k, v in sorted(details.items(), key=lambda x: -x[1])
            ])
            st.dataframe(det_df, hide_index=True, use_container_width=True)

    with col_r:
        st.subheader("📋 Fondamentaux")
        fund_rows = [
            ("P/E trailing", info.get("pe_ratio")),
            ("P/E forward", info.get("forward_pe")),
            ("PEG", info.get("peg_ratio")),
            ("P/Book", info.get("price_to_book")),
            ("Dividende", f"{info.get('dividend_yield',0) or 0:.1%}" if info.get("dividend_yield") else None),
            ("Croissance BPA", f"{info.get('earnings_growth',0) or 0:.1%}" if info.get("earnings_growth") else None),
            ("Croissance CA", f"{info.get('revenue_growth',0) or 0:.1%}" if info.get("revenue_growth") else None),
            ("Beta", info.get("beta")),
            ("Cap. boursière (M)", f"{(info.get('market_cap') or 0)/1e6:,.0f}"),
            ("52S Haut", info.get("52w_high")),
            ("52S Bas", info.get("52w_low")),
        ]
        st.dataframe(
            pd.DataFrame([{"Indicateur": k, "Valeur": str(v) if v is not None else "N/A"} for k, v in fund_rows]),
            hide_index=True, use_container_width=True,
        )

    # ── AI Analysis ──
    st.divider()
    st.subheader("🤖 Synthèse IA (Claude)")

    run_ai = st.button("Lancer l'analyse IA", type="primary")
    run_sent = st.checkbox("Inclure analyse sentiment news", value=False)

    if run_ai:
        sentiment = None
        if run_sent:
            with st.spinner("Scraping news & scoring sentiment…"):
                from backend.sentiment import get_news_sentiment
                sentiment = get_news_sentiment(ticker, info.get("name", ticker))

        with st.spinner("Appel Claude API…"):
            from backend.ai_analyst import generate_ai_analysis
            analysis = generate_ai_analysis(ticker, info, score_data, prediction, sentiment)

        if analysis:
            verdict = analysis.get("verdict", "N/A")
            verdict_class = {
                "ACHETER": "verdict-acheter",
                "SURVEILLER": "verdict-surveiller",
                "EVITER": "verdict-eviter",
            }.get(verdict, "verdict-surveiller")

            conv = analysis.get("conviction", 0)
            conv_stars = "⭐" * conv + "☆" * (5 - conv)

            col_v, col_c, col_h = st.columns(3)
            col_v.markdown(f'<div class="{verdict_class}">{verdict}</div>', unsafe_allow_html=True)
            col_c.metric("Conviction", conv_stars)
            col_h.metric("Horizon", analysis.get("horizon_recommande","—").title())

            st.info(f"**Résumé :** {analysis.get('resume_court','')}")

            col_tech, col_fund = st.columns(2)
            with col_tech:
                st.markdown("**Analyse technique**")
                st.write(analysis.get("analyse_technique", ""))
            with col_fund:
                st.markdown("**Analyse fondamentale**")
                st.write(analysis.get("analyse_fondamentale", ""))

            cat_pos = analysis.get("catalyseurs_positifs", [])
            risques = analysis.get("risques_principaux", [])
            col_cat, col_risk = st.columns(2)
            with col_cat:
                st.markdown("**✅ Catalyseurs positifs**")
                for item in cat_pos:
                    st.markdown(f"- {item}")
            with col_risk:
                st.markdown("**⚠️ Risques principaux**")
                for item in risques:
                    st.markdown(f"- {item}")

            st.markdown("**Note finale**")
            st.write(analysis.get("note_finale", ""))
        else:
            st.error("Analyse IA échouée. Vérifiez ANTHROPIC_API_KEY dans config.py.")

    # ── Sentiment ──
    if run_sent and not run_ai:
        st.divider()
        st.subheader("📰 Analyse sentiment news")
        with st.spinner("Scraping & scoring news…"):
            from backend.sentiment import get_news_sentiment
            sentiment = get_news_sentiment(ticker, info.get("name", ticker))

        sco = sentiment["score"]
        col_s1, col_s2, col_s3 = st.columns(3)
        col_s1.metric("Score sentiment", f"{sco:+.3f}")
        col_s2.metric("Tendance", sentiment["trend"])
        col_s3.metric("Articles analysés", sentiment["articles_count"])

        st.caption(sentiment["summary"])

        c_pos, c_neg = st.columns(2)
        with c_pos:
            st.markdown("**📈 Top articles positifs**")
            for a in sentiment.get("top_positive", []):
                st.markdown(f"- [{a['title'][:80]}]({a.get('link','#')}) `{a['score']:+.2f}`")
        with c_neg:
            st.markdown("**📉 Top articles négatifs**")
            for a in sentiment.get("top_negative", []):
                st.markdown(f"- [{a['title'][:80]}]({a.get('link','#')}) `{a['score']:+.2f}`")

    # ── Raw indicators ──
    with st.expander("🔢 Indicateurs bruts — 15 dernières lignes"):
        cols_show = [c for c in ["Close","ema20","ema50","ema200","rsi","macd",
                                   "macd_signal","bb_upper","bb_lower","atr","adx","stoch_k"] if c in df.columns]
        st.dataframe(df[cols_show].tail(15).round(2), use_container_width=True)


# ─── APP ROUTING ───
def main():
    with st.sidebar:
        st.title("📈 Stock Analyzer AI")

        page = st.radio("Navigation", ["🔍 Fiche action", "📊 Screener", "⭐ Watchlist"],
                        label_visibility="collapsed")

        st.divider()
        ticker_input = st.text_input("Ticker", value="MC.PA", placeholder="MC.PA, AAPL…")
        period = st.selectbox("Période historique", ["3mo","6mo","1y","2y","5y"], index=2)

        st.divider()
        st.caption("📌 **Watchlist**")
        wl = watchlist_get()
        for item in wl[:8]:
            col_t, col_x = st.columns([3,1])
            if col_t.button(item["ticker"], key=f"wl_{item['ticker']}", use_container_width=True):
                st.session_state["wl_ticker"] = item["ticker"]
            if col_x.button("✕", key=f"rm_{item['ticker']}"):
                watchlist_remove(item["ticker"])
                st.rerun()

    ticker = st.session_state.get("wl_ticker", ticker_input.strip().upper())

    if "📊 Screener" in page:
        page_screener()
    elif "⭐ Watchlist" in page:
        st.header("⭐ Watchlist")
        wl = watchlist_get()
        if not wl:
            st.info("Watchlist vide. Ajoutez des actions depuis la fiche.")
        else:
            for item in wl:
                st.write(f"**{item['ticker']}** — {item.get('name','')}")
    else:
        if ticker:
            page_fiche(ticker, period=period)
        else:
            st.info("Saisissez un ticker dans la barre latérale.")


if __name__ == "__main__" or True:
    main()
