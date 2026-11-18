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

The primary leg is washout recovery, the pattern behind the winning
entries of the two previous cbBTC races: when the close sits at least
55 bps under its 45-bar mean and has already recovered 20 bps off the
lowest close of the last 10 bars, the bot buys at 80% size and exits at
+60 bps, the same -80 bps stop, or after 30 bars. The dip leg still
runs, but thin (25% size): on 20 unseen real BTC days the full-size dip
leg bled about -$8 a day while the washout leg lost only about -$0.5,
and this blend was the best dev-passing profile measured there (about
-$1.6 a day, worst day about -$8.6). The two legs never hold at once;
on the dev window the blend nets +$0.54.

## Run it

```sh
node main.ts < bars.ndjson
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=d397ay5y&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
