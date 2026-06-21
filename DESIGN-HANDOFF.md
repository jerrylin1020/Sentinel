# RADAR — Design Handoff Document

> 給 Claude Code 用的實作交付文件。此文件描述設計意圖、頁面結構、資料模型、技術選型與實作優先順序。請搭配 5 個 HTML mockup 一起參照。

---

## 1. 專案概觀

### 一句話定位
個人投資者的「異常訊號雷達」儀表板，每天自動掃描美股與加密貨幣的特殊情況（爆量、技術面突破、機構動向、whale wallet 異動、重大新聞），協助使用者即時判斷是否有法人偷買偷賣或技術面轉折。

### 核心使用情境
- **盤前 review**（台灣晚上 21:00 左右）：花 5 分鐘看隔夜美股異動
- **加密貨幣 24/7 監控**：whale 動向、鏈上指標、funding rate
- **盤中即時推播**：P1 等級訊號自動推 Telegram / LINE / Email
- **每週末 review**：看訊號歷史、調整規則閾值

### 核心設計原則
1. **訊號合流比單一訊號重要** — 多訊號加權計算 P1/P2 分級
2. **回測驅動** — 每條規則都有勝率與假訊號率指標
3. **觀察名單優先** — 不掃全市場，聚焦使用者關注的 30~50 檔
4. **資訊密度高** — 一螢幕看完，不滾動為佳（Bloomberg 風格）

---

## 2. 專案名稱建議

mockup 暫用 `RADAR`。以下幾個替代方案，依風格分類：

| 名稱 | 含義 | 適合語氣 |
|---|---|---|
| **RADAR** | 雷達，現用名稱 | 直接、不抽象 |
| **Sentinel** | 哨兵 | 嚴肅、專業、安全感 |
| **Pulsar** | 脈衝星，週期性訊號發射 | 科技感、節奏 |
| **Beacon** | 燈塔，發射訊號 | 溫和、引導 |
| **Sonar** | 聲納，探測未見之物 | 接近 RADAR 但更獨特 |
| **Periscope** | 潛望鏡，觀察隱藏動向 | 觀察 / 偷窺意象，貼合「抓法人偷買」 |
| **Vigil** | 守夜、警戒 | 簡短有力 |
| **Trove** | 寶藏，發掘機會 | 偏正向、發現感 |
| **Catalyst** | 催化劑 | 金融術語，立刻能理解 |
| **Tickr** | tick + r 縮寫風 | 短、好記、產品感 |
| **Whaleseye** | 鯨魚之眼 | 加密貨幣文化感強 |

**我的推薦排序**：

1. **Sentinel** — 名稱沉穩，定位準確（守望），國際化好，網域與商標相對好取得
2. **Pulsar** — 科技感強、念起來響亮，但容易與 Cloudflare/Apache 同名專案撞名
3. **Periscope** — 概念非常貼合「偷看法人動向」，但 Twitter 直播曾用過此名
4. **RADAR** — 直白好用，缺點是太通用、SEO 不利
5. **Tickr** — 適合做成 SaaS 產品的話最有商業感

**個人最推薦**：**Sentinel**（程式碼名稱用 `sentinel`，網域 `sentinel.app` 或 `sentinelhq.com`），對外 tagline 可以是「Your radar for market anomalies」。

---

## 3. 頁面結構（5 個主要頁面）

對應 mockup 檔案：

| # | 頁面 | 檔案 | 用途 |
|---|---|---|---|
| 1 | Dashboard 總覽 | `radar-dashboard-mockup.html` | 首頁，今日訊號數、觀察名單、熱力圖、新聞 |
| 2 | Signals 訊號列表 | `signals-list.html` | 所有觸發訊號的可篩選清單 |
| 3 | Watchlist 觀察名單管理 | `watchlist-management.html` | 標的管理、分組、個別閾值、推播設定 |
| 4 | Detail 個股 / 個幣詳情 | `ticker-detail.html` | 點 P1 訊號進來的細節頁 |
| 5 | Rules 規則設定 | `rules-settings.html` | 開關規則、調參數、看回測勝率 |

### 頁面導航
頂部 nav bar 五個 tab：`Dashboard / Signals / Watchlist / Detail / Rules`

### 每頁都有的共用元件
- 頂部 status bar：logo、頁面 nav、最後掃描時間、重新整理、EN/繁中切換
- 「pulse dot」綠色閃光點示意系統在線
- 一致的 panel + panel-header 結構

---

## 4. 視覺設計系統

### 色彩變數（CSS variables，請直接沿用）
```css
--bg: #0a0e1a;          /* 主背景 */
--panel: #0f1422;        /* 區塊背景 */
--panel-2: #131a2a;      /* 區塊頭、hover */
--panel-3: #182137;      /* selected 狀態 */
--border: #1e2638;
--border-light: #2a3349;
--text: #d4d8e0;
--text-dim: #7a839a;
--text-faint: #4a5266;
--up: #00d97e;           /* 漲、正面 */
--down: #ff3b58;         /* 跌、負面、P1 */
--p1: #ff3b58;
--p2: #ffb627;
--cyan: #00b8d9;         /* 強調色、爆量訊號 */
--amber: #ffa502;        /* 技術突破訊號 */
--purple: #b39ddb;       /* 籌碼訊號 */
--blue: #4d8eff;         /* 新聞訊號 */
```

### 字型
- **內文**：Inter / Noto Sans TC（中文）
- **數字 / mono**：JetBrains Mono（含 `font-variant-numeric: tabular-nums`）
- **基準字級**：14px

### 風格參考
Bloomberg Terminal 深色主題、TradingView 圖表。資訊密度高、最小留白、紅綠分明。

### 訊號 tag 顏色慣例
| 類型 | 顏色 | CSS class |
|---|---|---|
| Volume 爆量 | 青 | `.tag-volume` |
| Breakout 突破 | 琥珀 | `.tag-breakout` |
| Flow 籌碼 | 紫 | `.tag-flow` |
| On-chain 鏈上 | 綠 | `.tag-onchain` |
| News 新聞 | 藍 | `.tag-news` |
| Tech 技術 K 棒 | 紅 | `.tag-tech` |

### i18n
所有 UI 文字使用 `data-en` / `data-zh` 屬性，JS 切換 textContent。預設繁中，localStorage 記憶選擇。價格、股票代號維持原樣。

---

## 5. 訊號分級與評分

### 分級
- **P1（紅）** — 立即推播，合流分數 ≥ 7.5 且至少 3 個基礎規則同時觸發
- **P2（琥珀）** — 進每日彙整，單一強訊號觸發
- **觀察（灰）** — 僅紀錄，不推播

### 合流分數計算（建議起點）
```
score = Σ(rule_weight × rule_severity) 
       × time_window_decay  
       × confluence_bonus(n_rules)
```
- 每條規則有預設權重（例如 volume_spike = 2.4, breakout_52w = 2.1, inst_buy = 2.3, news_positive = 2.4）
- 30 分鐘窗口內多訊號加總
- 3 個以上規則同時觸發加上 `confluence_bonus`（例如 +15%）

### 去重 / 降噪
- 同標的同訊號類型 N 小時內不重複推
- P1 推播 cooldown：每標的每天最多 3 次

---

## 6. 規則庫（MVP 必備規則）

| 類別 | 規則名稱 | 參數 | 適用 |
|---|---|---|---|
| Volume | Volume Spike 2x+ | multiplier (1.5–5x), lookback (5–60d), min price | 美股 + 加密 |
| Technical | 52-Week High Breakout | volume confirm ≥, min break % | 美股 + 加密 |
| Technical | 200MA Breakout | direction (up/down), confirm bars | 美股 + 加密 |
| Technical | Long Green / Red Candle | body ratio threshold | 美股 + 加密 |
| Technical | Bollinger Band Break | period, std deviations | 美股 + 加密 |
| Flow | Institutional Block Trade | min USD, dark pool vs lit | 美股 |
| Flow | Options Call/Put Sweep | premium threshold | 美股 |
| On-chain | Whale Inflow / Outflow ≥ $X | min inflow, min wallet size | 加密 |
| On-chain | Exchange Net Flow | direction, threshold | 加密 |
| On-chain | Funding Rate Spike | threshold % | 加密永續 |
| On-chain | SOPR / MVRV Extreme | threshold | BTC/ETH |
| News | Positive / Negative News | sentiment threshold | 美股 + 加密 |
| News | Analyst Rating Change | type filter | 美股 |
| Composite | P1 Composite | min score, min rules, time window | 全部 |

### 每條規則必備欄位
- `id`, `name`, `category`, `description`
- `enabled: bool`
- `params: dict`（可調）
- `applies_to: ['equity', 'crypto']`
- `weight: float`（合流時的權重）
- `backtest_stats: { win_rate, avg_return, false_positive, sharpe, triggers_per_day, last_run_at }`

---

## 7. 資料源

### 美股
- **行情 / K 線**：Polygon.io（推薦，付費）/ Alpaca（免費含 IEX 資料）/ Yahoo Finance（免費，限速嚴）
- **基本面**：Polygon / Finnhub
- **機構動向**：Unusual Whales API（options flow + dark pool）/ FINRA short interest
- **新聞**：Benzinga API / NewsAPI / Polygon News

### 加密貨幣
- **行情 / K 線 / OI / Funding**：Binance API（免費）/ Bybit API / CCXT
- **鏈上資料**：Glassnode（付費）/ Nansen / Etherscan + Bitquery（部分免費）/ DefiLlama API（TVL）
- **新聞**：CryptoPanic API / CoinDesk RSS

### 通用 / 總經
- VIX、DXY、利率：FRED API（免費）
- 經濟事件日曆：Trading Economics / Investing.com

### 建議 MVP 起手
免費起步：Yahoo Finance（美股）+ Binance（加密）+ NewsAPI（新聞）+ FRED（總經）
付費升級：Polygon（穩定行情）+ Glassnode（鏈上）

---

## 8. 技術選型建議

### 後端
- **語言**：Python 3.11+
- **資料處理**：pandas、numpy、ta-lib（技術指標）、ccxt（加密交易所）
- **資料庫**：
  - PostgreSQL + TimescaleDB extension（時序資料、訊號紀錄）
  - Redis（熱資料快取、推播 dedup）
- **排程**：APScheduler 或 Airflow（簡單就用前者）
- **訊息佇列**：可選 Redis Streams 或 RabbitMQ（多 worker 時）

### API / 後端服務
- **FastAPI**（Python，async 友善，自動產 OpenAPI doc）
- ORM：SQLAlchemy 或 SQLModel
- Auth：先做 single-user，未來再 supabase / auth0

### 前端
- **Next.js 14**（App Router）+ TypeScript + Tailwind CSS
- 圖表：**Lightweight Charts**（TradingView 出的，最像 Bloomberg）或 Recharts
- 狀態管理：Zustand（簡單）或 TanStack Query（API 快取）
- i18n：next-intl

### 部署
- **後端**：Railway / Fly.io / 自架 VPS（Docker compose）
- **前端**：Vercel
- **DB**：Supabase（Postgres + TimescaleDB 支援）或自架

### 推播管道
- Telegram Bot API（最簡單）
- LINE Notify
- SendGrid / Resend（Email）
- Discord webhook（選配）

---

## 9. 建議的檔案結構

```
sentinel/                           # 專案根目錄
├── apps/
│   ├── web/                        # Next.js 前端
│   │   ├── app/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx        # Dashboard
│   │   │   │   ├── signals/page.tsx
│   │   │   │   ├── watchlist/page.tsx
│   │   │   │   ├── detail/[symbol]/page.tsx
│   │   │   │   └── rules/page.tsx
│   │   │   └── api/
│   │   ├── components/
│   │   │   ├── ui/                 # 基礎元件（Panel, Badge, Tag）
│   │   │   ├── signals/
│   │   │   ├── charts/
│   │   │   └── layout/
│   │   ├── lib/
│   │   └── messages/               # i18n: en.json, zh-TW.json
│   └── api/                        # FastAPI 後端
│       ├── routers/
│       ├── models/
│       ├── services/
│       └── main.py
├── packages/
│   ├── scanner/                    # 掃描引擎核心
│   │   ├── rules/                  # 每條規則一個檔案
│   │   │   ├── volume_spike.py
│   │   │   ├── breakout_52w.py
│   │   │   ├── whale_inflow.py
│   │   │   └── ...
│   │   ├── engine.py               # 規則執行器
│   │   ├── scorer.py               # 合流分數計算
│   │   └── deduper.py              # 去重邏輯
│   ├── data/                       # 資料源 adapter
│   │   ├── equity/
│   │   │   ├── polygon.py
│   │   │   └── yahoo.py
│   │   ├── crypto/
│   │   │   ├── binance.py
│   │   │   └── glassnode.py
│   │   └── news/
│   ├── notifier/                   # 推播 adapter
│   │   ├── telegram.py
│   │   ├── line.py
│   │   └── email.py
│   ├── backtester/                 # 回測模組
│   └── shared/                     # 共用 types、utils
├── infra/
│   ├── docker-compose.yml
│   └── migrations/                 # Alembic / Prisma migrations
├── scripts/
│   ├── seed_watchlist.py
│   └── run_backtest.py
└── README.md
```

---

## 10. 資料模型（簡化版）

```python
# Watchlist
class Symbol:
    id: int
    ticker: str                  # "NVDA"
    name: str                    # "NVIDIA Corp"
    asset_type: enum             # equity | crypto
    exchange: str                # "NASDAQ" | "BINANCE"

class WatchlistGroup:
    id: int
    name: str                    # "Tech Mega Caps"
    symbols: list[Symbol]

class WatchedSymbol:
    symbol_id: int
    group_ids: list[int]
    p1_score_threshold: float    # 預設 7.0
    volume_multiplier: float     # 預設 2.0
    enabled_rules: list[str]
    channels: list[str]          # ["telegram", "email"]
    quiet_hours: tuple[time, time]
    notes: str

# Rules
class Rule:
    id: str                      # "volume_spike_2x"
    name: str
    category: enum
    applies_to: list[str]        # ["equity", "crypto"]
    weight: float
    params: dict                 # 規則參數
    enabled: bool

class RuleBacktestStats:
    rule_id: str
    period: str                  # "2y"
    win_rate: float
    avg_return: float
    false_positive_rate: float
    sharpe: float
    triggers_per_day: float
    updated_at: datetime

# Signals
class Signal:
    id: int
    symbol_id: int
    rule_id: str
    triggered_at: datetime
    severity: enum               # p1 | p2 | observe
    score: float
    score_components: dict       # 拆解每條規則的貢獻
    price_at_trigger: float
    volume_multiplier: float
    metadata: dict               # 規則特有的細節
    notified_channels: list[str]
    notified_at: datetime
    status: enum                 # new | seen | acted | dismissed

# News
class NewsItem:
    id: int
    symbol_id: int
    source: str
    title: str
    url: str
    published_at: datetime
    sentiment_score: float
```

---

## 11. 排程設計

### Scan jobs
- **加密貨幣 1 分鐘 tick**：cron `* * * * *`，掃所有 crypto 觀察名單的爆量、價格突破
- **美股 5 分鐘 tick（盤中）**：開盤時段每 5 分鐘
- **日線收盤後**：美股 4:30pm ET，跑完整規則（含技術、籌碼、機構動向）
- **鏈上資料 15 分鐘 tick**：whale flows、exchange flows
- **新聞 5 分鐘 polling**：or webhook 即時
- **每週日凌晨**：跑所有規則回測，更新 win rate
- **每天早上 8am**：產生「昨日異動報告」推 Email

---

## 12. 實作優先順序（建議 3 階段 MVP）

### Phase 1 — 骨架（1~2 週）
- ✅ 後端 FastAPI 起手、PostgreSQL + TimescaleDB
- ✅ 串 Yahoo Finance（美股）+ Binance（加密）
- ✅ 寫 3 條核心規則：volume_spike, breakout_52w, long_green_candle
- ✅ Watchlist CRUD API
- ✅ 簡單 Telegram 推播
- ✅ 前端 Dashboard 與 Watchlist 頁先接通

### Phase 2 — 訊號合流與規則庫（2~3 週）
- 完整實作 12+ 條規則
- 合流分數 / P1 P2 升級邏輯
- 回測模組（pandas 跑歷史）
- Signals 列表頁、Rules 設定頁
- Email / LINE 推播管道

### Phase 3 — 進階訊號（持續）
- 鏈上資料（Glassnode / Etherscan）
- 機構動向（Polygon / Unusual Whales）
- 新聞情緒（NewsAPI + 簡單 sentiment）
- 個股詳情頁完整版（K 線 + 訊號疊加）
- ML 異常偵測（Isolation Forest）

---

## 13. 關鍵實作注意事項

### 必做
1. **每條規則都要有單元測試與回測**，不通過勝率門檻不上線
2. **訊號去重要做好**，否則使用者會被洗版（每個訊號加 dedup key）
3. **時區處理**：美股用 ET、加密用 UTC，前端用使用者本地
4. **API rate limit 保護**：Yahoo Finance 容易被擋，要加快取
5. **資料品質檢查**：價格 / 量出現 NaN 或 0 時不觸發訊號

### 容易踩坑
1. ta-lib 安裝在 Mac 比較麻煩，建議用 `pandas-ta` 替代
2. Binance API 在台灣可能要 VPN 或用備援域名
3. Polygon 免費版有 5 calls/min 限制，要做 queue
4. TimescaleDB hypertable 設定一定要做，不然查詢會慢

### 不急做
- 多使用者 / Auth
- 行動 App（先用響應式網頁）
- 自動下單（這是雷達不是交易系統）
- 社群分享功能

---

## 14. 給 Claude Code 的初始 prompt 範例

把這份文件給 Claude Code 後，可以這樣開啟：

```
請依據 DESIGN-HANDOFF.md 文件，幫我 bootstrap 這個專案。
- 用 monorepo（pnpm workspaces）
- 後端先寫 FastAPI + PostgreSQL，含基本的 Symbol、Watchlist、Rule、Signal models
- 前端 Next.js 14 起手，把 5 個頁面的路由先建好（暫用假資料）
- Docker compose 含 postgres + redis
- 先實作 volume_spike 一條規則 + Telegram 推播作為 end-to-end demo

實作 Phase 1 的目標。
不要寫 README，直接動手。
```

---

## 15. 附件清單

工作目錄中已有的 5 個 mockup HTML（請 Claude Code 把它們當成視覺 spec 直接參照像素細節）：
- `radar-dashboard-mockup.html`
- `signals-list.html`
- `watchlist-management.html`
- `ticker-detail.html`
- `rules-settings.html`

---

**版本**：v1.0 · 2026-06-21  
**狀態**：設計階段完成，待實作  
**作者**：Jerry × Claude（設計）
