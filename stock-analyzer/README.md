# Stock Analyzer AI

Analyseur boursier intelligent avec prédictions visuelles et synthèse IA.

## Lancement rapide

```bash
cd stock-analyzer
pip install -r requirements.txt
streamlit run app.py
```

## Configuration

Copier `.env.example` ou éditer `config.py` :
```python
ANTHROPIC_API_KEY = "sk-ant-..."  # requis pour phases 6-8
```

## Phases

| Phase | Module | Statut |
|-------|--------|--------|
| 1 | Structure projet | ✅ |
| 2 | Data Fetcher (yfinance) | ✅ |
| 3 | Indicateurs techniques | ✅ |
| 4 | Prédictions Prophet | ⏳ |
| 5 | Graphique complet | ⏳ |
| 6 | Sentiment & News | ⏳ |
| 7 | Screener | ⏳ |
| 8 | Synthèse IA (Claude) | ⏳ |

## Ticker de test : `MC.PA` (LVMH)
