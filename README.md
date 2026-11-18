# btc-race-dipbot

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/cleoworks/btc-race-dipbot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/cleoworks/btc-race-dipbot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A selective dip-buying bot for cbBTC on 1-minute bars. It buys only a sharp
dip (close at least 40 bps under its close 20 bars earlier) while the 240-bar
regime return is no worse than -50 bps, spends 80% of its cash, and exits on
a +120 bps take profit, a -80 bps stop, or after 90 bars. On the kit's dev
window every house baseline loses money; this strategy was chosen from a
parameter sweep for a profitable plateau, not a single optimum.

## Run it

```sh
node main.ts < bars.ndjson
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=d397ay5y&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
