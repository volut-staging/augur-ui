import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { SimpleBreakdownModal } from "modules/modal/simple-breakdown-modal";
import { selectMarket } from "modules/markets/selectors/market";
import { closeModal } from "modules/modal/actions/close-modal";
import { sellCompleteSets } from "modules/positions/actions/sell-complete-sets";
import { createBigNumber } from "utils/create-big-number";
import { formatEther } from "utils/format-number";

const mapStateToProps = (state: any) => {
  const market = selectMarket(state.modal.marketId);
  const numCompleteSets = createBigNumber(state.modal.numCompleteSets.formatted);
  const min = market.minPrice;
  const max = market.maxPrice;
  const settlementFeePercent = createBigNumber(market.settlementFee);
  const grossETH = max.minus(min).times(numCompleteSets);
  const settlementFee = settlementFeePercent.times(numCompleteSets);
  const netETH = grossETH.minus(settlementFee);

  return {
    modal: state.modal,
    profitBreakdown: {
      grossETH: formatEther(grossETH),
      settlementFee: formatEther(settlementFee),
      netETH: formatEther(netETH)
    },
    marketTitle: market.description
  }
};

const mapDispatchToProps = (dispatch: Function) => ({
  closeModal: () => dispatch(closeModal()),
  sellCompleteSets: (marketId: string, numCompleteSets: any, cb: Function) =>
    dispatch(sellCompleteSets(marketId, numCompleteSets, cb))
});

const mergeProps = (sP: any, dP: any, oP: any) => ({
  title: "Sell Complete Sets",
  modal: sP.modal,
  breakdown: [
    {
      label: "Settlement Fees",
      value: sP.profitBreakdown.settlementFee.full
    },
    {
      label: "Total",
      value: sP.profitBreakdown.netETH.full
    }
  ],
  marketTitle: sP.marketTitle,
  closeAction: () => dP.closeModal(),
  buttons: [
    {
      text: "Sell Complete Sets",
      action: () => {
        dP.sellCompleteSets(oP.modal.marketId, oP.modal.numCompleteSets, oP.modal.cb);
        dP.closeModal();
      }
    }
  ]
});

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  )(SimpleBreakdownModal)
);
