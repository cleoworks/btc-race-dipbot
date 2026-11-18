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

A second leg adds washout recovery, the pattern behind the winning entries
of the two previous cbBTC races: when the close sits at least 55 bps under
its 45-bar mean and has already recovered 20 bps off the lowest close of
the last 10 bars, the bot buys (same 80% size) and exits at +60 bps, the
same -80 bps stop, or after 30 bars. The two legs never hold at once. On
114 synthetic days rebuilt from the dev window's own paths, the combined
bot averaged about +$5 a day with 69% profitable days, against about -$8
and 17% for the dip leg alone; on the dev window itself it nets +$3.18.
The dip leg's threshold is also volatility-scaled (at least 40 bps, or
1.5x the recent 20-bar volatility over the dip horizon when that is
larger), which on the full 228-day synthetic suite lifted the combined
bot further, to about +$9 a day with 79% profitable days, without
changing a single dev-window trade.

## Run it

```sh
node main.ts < bars.ndjson
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=d397ay5y&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
