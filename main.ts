// Dip-buying mean-reversion bot for the cbBTC 24-hour race (bars-replay/v1).
//
// Why this shape: a full-size round trip on this pool costs roughly 26-35 bps
// once the 4 bps fee, the 2 bps modelled slippage and the constant-product
// price impact are paid, while one-minute noise is only about 6.7 bps. A bot
// that trades often donates its equity to those costs (the kit's EMA-cross
// baseline made 80 trades on the dev window and lost $148). So this bot
// trades rarely, only on a sharp dip inside a market that is not in freefall:
//
//   entry (flat, decided on a bar close, filled at the next bar open):
//     - the close fell at least DIP_BPS over the last DIP_LOOKBACK bars, and
//     - the REGIME_LOOKBACK return is at least REGIME_MIN_BPS (no freefall),
//     - and the signal is "armed": after any entry or exit the signal must
//       clear once before it can fire again, so one dip buys exactly once.
//   exit (whole position, decided on a bar close):
//     - take profit at +TAKE_PROFIT_BPS over the entry cost (fees included),
//     - stop loss at -STOP_LOSS_BPS under it,
//     - or MAX_HOLD_BARS bars held, whichever comes first.
//
// A late fallback entry (small, loosely gated, tightly exited) insures the
// race guardrail in a window where the main signal never fires at all.
//
// Position size is SIZE_PERCENT of the cash at decision time: large enough to
// matter, small enough that its own price impact stays near 9 bps a side.
// Orders carry MAX_SLIPPAGE_BPS wide open: the strategy was measured against
// a simulator that fills every order at the next open, and a slippage
// rejection the simulator never modelled would only desync the two.
//
// The bot speaks the protocol through the kit's shim: hello once, then one
// batch per bar, one reply of orders per batch. It keeps its own list of
// closes (a batch with no CBBTC bar adds none), reads no clock, no file and
// no environment, and uses only float arithmetic on the bar values, so two
// executions on the same bars produce the same orders byte for byte.

import { runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

/** Bars over which the entry dip is measured. */
const DIP_LOOKBACK = 20;
/** Dip size that arms an entry: the close is this many bps under its close DIP_LOOKBACK bars ago. */
const DIP_BPS = 40;
/** Bars over which the regime (trend) return is measured. */
const REGIME_LOOKBACK = 240;
/** The regime return may be negative, but no worse than this: below it the market is in freefall. */
const REGIME_MIN_BPS = -50;
/** Exit when the position is worth this many bps over its cost. */
const TAKE_PROFIT_BPS = 120;
/** Exit when the position is worth this many bps under its cost. */
const STOP_LOSS_BPS = 80;
/** Exit after this many bars in the position, profit or not. */
const MAX_HOLD_BARS = 90;
/** Share of the cash on hand that one entry spends, in percent. */
const SIZE_PERCENT = 80n;
/** Circuit breaker: once equity falls to this percent of its peak, no new entries for the rest of the run. */
const DRAWDOWN_HALT_PERCENT = 94n;

/** Fallback entry: if no position was ever opened by this bar, the main
 * signal never fired (a window-long freefall can do that), and an entry with
 * zero trades ranks below every entry that traded at all. A small, loosely
 * gated dip buy late in the window insures the guardrail at bounded cost. */
const FALLBACK_AFTER_BARS = 1300;
/** Fallback dip: the close is this many bps under its close DIP_LOOKBACK bars ago. */
const FALLBACK_DIP_BPS = 20;
/** Fallback regime floor: far looser than the main gate, it only rules out a vertical crash. */
const FALLBACK_REGIME_MIN_BPS = -200;
/** Share of the cash the fallback entry spends, in percent. */
const FALLBACK_SIZE_PERCENT = 25n;
/** Fallback exit: take profit in bps over the entry cost. */
const FALLBACK_TAKE_PROFIT_BPS = 60;
/** Fallback exit: stop loss in bps under the entry cost. */
const FALLBACK_STOP_LOSS_BPS = 60;
/** Fallback exit: maximum bars held. */
const FALLBACK_MAX_HOLD_BARS = 60;
/** Slippage cap on every order: wide open, as the measuring simulator assumed. */
const MAX_SLIPPAGE_BPS = 10_000;

/** Every CBBTC close seen so far, as a float USDC price, oldest first. */
const closes: number[] = [];
/** True while the entry signal may fire; cleared by an entry or an exit, restored when the signal clears. */
let armed = true;
/** Index into closes of the bar whose open filled the current position (-1 while flat). */
let entryBar = -1;
/** USDC per BTC the current position cost, fees included. */
let entryPrice = 0;
/** Highest equity (quote units) marked so far this run. */
let peakEquity = 0n;
/** True once the circuit breaker has tripped: entries stop, exits still run. */
let halted = false;
/** True once any position has been held this run (a buy filled at least once). */
let everHeld = false;
/** True while the open position is the fallback entry, whose exits are tighter. */
let fallbackPosition = false;
/** True when a fallback buy has been sent and its fill has not been seen yet. */
let fallbackPending = false;

/** The return in bps of the latest close against the close `lookback` bars earlier. */
function returnBps(lookback: number): number {
  const now = closes[closes.length - 1];
  const then = closes[closes.length - 1 - lookback];
  return (now / then - 1) * 10_000;
}

function onBatch(state: BarsState, batch: Batch): OrderInput[] {
  // Circuit breaker bookkeeping, on every batch: the race ranks an entry
  // below the bar if its drawdown passes 25%, so a run that is already
  // bleeding stops opening new risk long before that line is in sight.
  if (state.equity > peakEquity) peakEquity = state.equity;
  else if (!halted && peakEquity > 0n && state.equity * 100n < peakEquity * DRAWDOWN_HALT_PERCENT) halted = true;

  const bar = batch.bars.find((b) => b.symbol === SYMBOL);
  if (bar === undefined) return []; // a minute with no CBBTC bar: nothing new to decide on
  const scale = state.hello.symbols.find((s) => s.symbol === SYMBOL)?.price_scale ?? 5;
  closes.push(Number(bar.c) / 10 ** scale);
  const i = closes.length - 1;

  const held = state.positions.get(SYMBOL);
  const holding = held !== undefined && held.qty > 0n;

  if (holding && entryBar < 0) {
    // First batch that shows the position: its open filled our buy, so this
    // bar is the entry bar, and the account's cost is what the entry paid.
    entryBar = i;
    entryPrice = (Number(held.cost) * 100) / Number(held.qty);
    everHeld = true;
    fallbackPosition = fallbackPending;
    fallbackPending = false;
  }
  if (!holding) {
    entryBar = -1;
    fallbackPosition = false;
  }

  if (state.warmingUp) return [];

  if (holding) {
    const takeProfit = fallbackPosition ? FALLBACK_TAKE_PROFIT_BPS : TAKE_PROFIT_BPS;
    const stopLoss = fallbackPosition ? FALLBACK_STOP_LOSS_BPS : STOP_LOSS_BPS;
    const maxHold = fallbackPosition ? FALLBACK_MAX_HOLD_BARS : MAX_HOLD_BARS;
    const changeBps = (closes[i] / entryPrice - 1) * 10_000;
    if (changeBps >= takeProfit || changeBps <= -stopLoss || i - entryBar >= maxHold) {
      armed = false;
      return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  }

  if (halted) return []; // circuit breaker tripped: no new entries this run
  if (i < REGIME_LOOKBACK) return []; // not enough history for the regime return yet

  if (!everHeld && i >= FALLBACK_AFTER_BARS) {
    // The main signal never fired in this window: take the guardrail
    // insurance while there is still room to enter and exit again.
    const fallbackDipping = returnBps(DIP_LOOKBACK) <= -FALLBACK_DIP_BPS;
    const fallbackRegime = returnBps(REGIME_LOOKBACK) >= FALLBACK_REGIME_MIN_BPS;
    if (fallbackDipping && fallbackRegime) {
      const notional = (state.cash * FALLBACK_SIZE_PERCENT) / 100n;
      if (notional >= BigInt(state.hello.fees.min_notional_quote_units)) {
        fallbackPending = true;
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
    }
  }

  const dipping = returnBps(DIP_LOOKBACK) <= -DIP_BPS;
  const regimeOk = returnBps(REGIME_LOOKBACK) >= REGIME_MIN_BPS;
  if (dipping && regimeOk) {
    if (!armed) return [];
    armed = false;
    const notional = (state.cash * SIZE_PERCENT) / 100n;
    if (notional < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS }];
  }
  armed = true;
  return [];
}

await runBars({ onBatch });
