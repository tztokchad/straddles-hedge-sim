const bs = require("black-scholes");
const fetch = require("node-fetch");
const startToTs = 1641024000 + 86400 * 3; // Jan 1 2022 + 3 days
const url =
  "https://min-api.cryptocompare.com/data/v2/histohour?fsym=ETH&tsym=USD&limit=72&toTs=";
const apiKey = ""; // Add your CryptoCompare API Key here (optional)

let aggrPnl = 0;
const amount = 1;

function sim(currentPrice, settlement, data) {
  const strike = currentPrice;
  const timeToExpiry = 3 / 365;
  const volatility = 85 / 100;
  const hedgeVolatility = 80 / 100;

  const underlyingPurchased = amount / 2;
  const writerPremium = bs.blackScholes(
    currentPrice,
    strike,
    timeToExpiry,
    volatility,
    0,
    "put"
  );
  const hedgeStrike = Math.floor((strike - writerPremium) / 25) * 25;
  const hedgeAmount = (strike / hedgeStrike) * 1;
  const hedgePremium =
    bs.blackScholes(
      strike,
      hedgeStrike,
      timeToExpiry,
      hedgeVolatility,
      0,
      "put"
    ) * hedgeAmount;
  const funding = (currentPrice * 36) / 100 / 365;

  const buyerPnl =
    strike > settlement
      ? (strike - settlement) * (amount - underlyingPurchased)
      : (settlement - strike) * underlyingPurchased;

  const swapPnl = (settlement - strike) * underlyingPurchased;

  const hedgePnl =
    hedgeStrike > settlement ? (hedgeStrike - settlement) * hedgeAmount : 0;

  const finalPnlAfterHedge =
    writerPremium + funding + swapPnl - buyerPnl + hedgePnl - hedgePremium;

  aggrPnl += finalPnlAfterHedge;

  console.log({
    currentPrice,
    settlement,
    underlyingPurchased,
    hedgeStrike,
    hedgeAmount,
    writerPremium,
    hedgePremium,
    funding,
    buyerPnl,
    hedgePnl,
    finalPnlAfterHedge,
    aggrPnl
  });
}

const finalTs = Math.floor(new Date().getTime() / 1000);
console.log("final ts:", finalTs);

(async () => {
  let isTraversing = true;
  let currentPrice;
  let i = 0;
  let data;
  while (isTraversing) {
    try {
      let _url = `${url}${startToTs + 86400 * 3 * i++}&apiKey=${apiKey}`;
      const response = await fetch(_url);
      data = (await response.json()).Data.Data;
      console.log(new Date(data[data.length - 1].time * 1000).toLocaleString());
      currentPrice = data[0].open;
      const settlement = data[data.length - 1].close;
      sim(currentPrice, settlement, data);
      if (data[data.length - 1].time >= finalTs - 86400 * 3)
        isTraversing = false;
    } catch (e) {
      console.log("Error data:", data);
      console.error(e.stack);
    }
  }
  console.log(`Final return on ETH: ${(aggrPnl / currentPrice) * 100}%`);
})();
