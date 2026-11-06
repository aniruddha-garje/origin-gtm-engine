# GTM Engine, prepared for Origin

An independent work sample by Aniruddha for Origin's founders. Not affiliated with or endorsed by Origin. Built from public sources.

The site shows the reasoning behind a go-to-market plan for OG-1: how wages were benchmarked, how prospects were segmented, how robot veterans were found, and why every name and event is on the list.

## How it runs

```
GitHub Actions, daily at 04:17 UTC
  pipeline/run.mjs        pulls every public source, each isolated so one failure cannot stop the rest
  site/data/live.json     the day's output, committed to this repo
  GitHub Pages            republishes site/
```

No secrets are required. `BLS_API_KEY` is an optional repo secret that raises the wage API's limit.

| Source | What it adds |
| --- | --- |
| BLS OEWS | Taper wages by state and metro, plus the wage series for each next trade |
| NYC, Chicago, Seattle, Austin permits | Large interior jobs starting now |
| Texas TDLR | Data center fit-outs and large filings |
| USAspending | Contractors on federal jobs, and new finishing subs not yet on the list |
| Google News RSS | Project delays, robot news, data center news, labor squeeze |
| Event pages | Whether a date or price page changed |
| origin.tech | Whether the public claims in the register are still live |

A contractor is only tied to a headline when its name is in the headline. Project delays stay at market level otherwise, so nobody is labelled as running late on a keyword match.

## Layout

- `site/data/research.js`: the original research, unchanged
- `site/data/reasoning.js`: the thinking on top of it (event reasons, robot trail, trades)
- `site/assets/js/core.js`: scoring, ROI and event cost logic, carried over unchanged
- `site/assets/js/views/`: one file per page
- `pipeline/collectors/`: one file per source

## Add a trade

Add the occupation code to `TRADES` in `pipeline/collectors/wages.mjs` and a row to `trades` in `site/data/reasoning.js`. The wage map appears on the next run. The target list, robot trail and show are the research.

## Run locally

```
node pipeline/run.mjs
npx serve site
```
