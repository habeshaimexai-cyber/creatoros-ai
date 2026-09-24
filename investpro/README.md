# InvestPro

**Current revision, 2026-09-24:** See `README-CLAUDE.md` for the complete source-review handoff. Edit the readable `frontend.html`, run `npm run ui:sync`, then `npm test`. Performance now shows immutable saved CHF valuations with provenance and dated points; forecast shows dated historical model windows rather than projected CHF targets. Stress assumptions start blank. Earlier validation notes below describe previous revisions, not fresh live-provider verification.

Private German-language stock and portfolio application, served by a self-contained Cloudflare Worker.

- `/api/search`: international provider search with a 36-stock name/ticker fallback.
- `/api/quote`, `/api/history`, `/api/stock`: provider quotes with actual quote timestamps, previous-session change, daily history, technical indicators and separate news links.
- `/api/scanner`: bounded, fixed international stock selection; explicit coverage and failures.
- `/api/overview`, `/api/forecast`, `/api/technical`, `/api/rates`: market overview, rule-based trend score, Wilder RSI / MACD / aligned beta, currency conversion.
- Local portfolio data, transactions with fees and guarded undo, watchlist, snapshots, CSV and validated backup import. Existing `investpro-data` browser storage remains compatible.

Signal strength is a heuristic score, never a calibrated probability. Quotes can be delayed, unavailable or stale; the source timestamp is shown. No guarantee of exchange-wide realtime coverage. Fundamentals and macro series are not connected. There is no LLM service. Portfolio currencies: CHF, EUR, USD, GBP. Valuation uses configured current exchange rates rather than historical FX. Monitoring runs while the page is open and visible. No server-side portfolio persistence or background notifications when closed.

Run `node tests/regression.mjs` for deterministic financial calculation, failure-state and portfolio regression checks. Run `npm run build` then `npm run validate` for the standalone artifact. Chart.js 4.4.1 is vendored with its MIT license and served from the same origin.

Validation for this revision: regression checks passed; actual NVIDIA search and Nestlé quote/history/news returned successfully. This Worker-only project has no compatible supervised browser-preview server, so full visual browser QA was unavailable.

## Intraday and source comparison
The stock detail page starts with Live · 30 s: the last 30 available trading minutes, refreshed every 30 seconds while visible. Five-minute, one-hour and one-session windows preserve actual minute timestamps; they are not second bars. Daily history remains separate. Pause/manual refresh controls are provided. Leaving the view stops polling, and outdated requests cannot overwrite another symbol.

`/api/intraday` uses Yahoo 1-minute bars with an optional 15-second cache. BTC-USD and ETH-USD also request the public Kraken last-trade endpoint, which can supply a quote if Yahoo fails (without fabricating a history). For eligible alphabetic US tickers, Finnhub is implemented but **not connected until** the owner configures the server secret `FINNHUB_API_KEY` through Sites. No key is embedded in the page or sent to browsers. Symbol and currency are verified using the company profile. Other international stocks currently use Yahoo alone. Independent provider availability is displayed honestly. Source comparisons require matching currencies, quotes no more than two minutes apart and neither older than five minutes; differences are not accuracy or probability scores. No guarantee of 99.9% accuracy.

The website is hosted online, independent of the user's computer; it still depends on hosting, authentication and data providers. Existing portfolio storage is device-local. Polling is not a background server monitoring service.

## Personalized diversification, risk and scenarios

The three portfolio views now use `portfolio-math.js`, a pure calculation engine delivered from the same origin. No sample holdings or remembered balances are inserted. The owner must have actual holdings in the existing device-local portfolio. An optional validated profile (goal, months, tolerated loss, position limit) is stored in settings and survives backup import/export.

Opening a portfolio analysis view requests five-year public quote histories for the recorded tickers and relevant currency-to-CHF pairs, with concurrency three. Quantities and the profile remain in the browser. Latest source quotes are used for these views, with saved-price fallback explicitly marked. These calculations do not silently overwrite recorded holdings or connect a brokerage account.

Position concentration, effective position count and asset-class/trading-currency weights use current valuation. Classes are user supplied; sector/country and ETF holdings look-through are unavailable. Historical prices (adjusted if the entire series exists, otherwise raw close) are converted using date-matched historical FX. All positions must have adequate histories and at least 60 common return observations; gaps longer than ten days block the model. No missing exposure is assumed riskless. CHF cash contributes a zero market return; bank/credit/inflation risks are outside the model.

The model applies today's weights at every observed interval (hypothetical daily rebalancing). It computes sample volatility annualized with the actual observation frequency, drawdown, worst observed interval, and correlations. It is not actual historical portfolio performance. Rolling 30/90/365-calendar-day windows now retain start/end dates and returns for direct audit. Internal compatibility fields still compute P10/median/P90 when at least 20 windows exist, but the UI displays dated historical returns without projected targets; overlapping windows are not independent and quantiles are not forward probabilities. Fees, taxes, future flows and changing holdings are excluded. A separate user-selected stress is explicitly an assumption. No fixed 7% forecast or asset-class risk score is used by the three views or dashboard.

Validation: `node tests/regression.mjs`, `node tests/portfolio.mjs`, build and artifact validation passed. A real NVDA five-year request returned 1,254 observations (2021-09-24 to 2026-09-23). Worker-only architecture has no compatible supervised visual browser preview. Runtime availability of other portfolio tickers is shown individually.

## Guided position capture and navigation

The header, Portfolio page and all three personal-analysis empty states now open one native dialog. Search selects an actual instrument; source quote, currency, timestamp and instrument type are loaded automatically. The user enters a positive quantity (including fractional holdings), an optional cost basis, and confirms their asset class. Nothing is seeded into holdings and no trade is executed. After a successful durable browser write, direct links open diversification, risk and scenarios; a separate action adds another holding. Empty states also offer individual-stock analysis without changing the portfolio. Advanced manual entry remains available.

Missing purchase cost is represented by `costKnown:false, buyPrice:null`; it is not treated as zero. Dashboard, portfolio and professional profit displays suppress unknown gains. Later buys retain unknown basis; sales leave realized gain null until a valid basis is supplied. A basis can be entered in the portfolio table. Backups preserve unknown basis and CSV exports include costKnown. Storage failures do not report a position as saved. Request generations protect instrument selection; portfolio refreshes queue if another refresh is already running. Navigation tolerates a missing navigation element and scrolls to the destination.

The professional page's obsolete class-based composite score was replaced by the same measured historical volatility used in the personal risk view. Tests cover generated empty-state button activation, dialog capture, fractions, optional cost basis, persistence failures, all three analysis links and subsequent transactions. Supervised visual browser preview remains unavailable for this Worker-only architecture.

