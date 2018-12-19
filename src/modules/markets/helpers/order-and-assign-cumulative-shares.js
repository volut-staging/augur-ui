import memoize from "memoizee";
import { createBigNumber } from "utils/create-big-number";
import { ZERO } from "modules/trades/constants/numbers";
import { BIDS, ASKS } from "modules/orders/constants/orders";
import { formatEther } from "utils/format-number";

function calculateMySize(openOrders, loginAccount, price) {
  if (openOrders) {
    const accountOrdersInPrice = (Object.keys(openOrders) || []).filter(
      key =>
        openOrders[key].owner === loginAccount &&
        openOrders[key].fullPrecisionPrice === price.fullPrecision
    );
    let total = createBigNumber(0);
    for (let i = 0; i < accountOrdersInPrice.length; i++) {
      if (openOrders[accountOrdersInPrice[i]]) {
        total = total.plus(
          openOrders[accountOrdersInPrice[i]].fullPrecisionAmount
        );
      }
    }
    return total.eq(ZERO) ? null : formatEther(total);
  }
  return null;
}

function calculateQuantityScale() {

}

const orderAndAssignCumulativeShares = memoize(
  (orderBook, userOpenOrders, loginAccount) => {
    const rawBids = ((orderBook || {})[BIDS] || []).slice();
    const rawAsks = ((orderBook || {})[ASKS] || []).slice();
    const bidsAsksSort = (rawBids.concat(rawAsks)).sort((a, b) => b.shares.value - a.shares.value);
    const mostShares = bidsAsksSort[0] && bidsAsksSort[0].shares && bidsAsksSort[0].shares.value;
   
    const bids = rawBids.sort((a, b) => b.price.value - a.price.value).reduce(
      (p, order, i, orders) => [
        ...p,
        {
          price: order.price,
          shares: order.shares,
          quantityScale: calculateQuantityScale(),
          cumulativeShares:
            p[i - 1] != null
              ? p[i - 1].cumulativeShares.plus(order.shares.fullPrecision)
              : createBigNumber(order.shares.fullPrecision),
          mySize: userOpenOrders
            ? calculateMySize(userOpenOrders.buy, loginAccount, order.price)
            : order.shares // use shares for creating market
        }
      ],
      []
    );

    const asks = rawAsks
      .sort((a, b) => a.price.value - b.price.value)
      .reduce(
        (p, order, i, orders) => [
          ...p,
          {
            price: order.price,
            shares: order.shares,
            quantityScale: calculateQuantityScale(),
            cumulativeShares:
              p[i - 1] != null
                ? p[i - 1].cumulativeShares.plus(order.shares.fullPrecision)
                : createBigNumber(order.shares.fullPrecision),
            mySize: userOpenOrders
              ? calculateMySize(userOpenOrders.sell, loginAccount, order.price)
              : order.shares // use shares for creating market
          }
        ],
        []
      )
      .sort((a, b) => b.price.value - a.price.value);

    return {
      bids,
      asks
    };
  }
);

export default orderAndAssignCumulativeShares;
