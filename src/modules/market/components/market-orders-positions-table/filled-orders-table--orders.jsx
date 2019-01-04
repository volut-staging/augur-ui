/* eslint-disable jsx-a11y/no-static-element-interactions */ // needed because <button> cannot take the place <ul> in the table structure

import PropTypes from "prop-types";
import React, { Component } from "react";
import classNames from "classnames";

import getValue from "utils/get-value";
import { SELL } from "modules/trades/constants/types";
import { formatEther, formatShares } from "utils/format-number";
import { convertUnixToFormattedDate } from "utils/format-date";
import ChevronFlip from "modules/common/components/chevron-flip/chevron-flip";
import EtherscanLink from "modules/common/containers/etherscan-link";

import SharedStyles from "modules/market/components/market-positions-table/market-positions-table--position.styles";
import Styles from "modules/market/components/market-orders-positions-table/filled-orders-table--orders.styles";
import TableStyles from "modules/market/components/market-orders-positions-table/open-orders-table.style";

export default class FilledOrdersOrder extends Component {
  static propTypes = {
    isMobile: PropTypes.bool.isRequired,
    order: PropTypes.shape({
      type: PropTypes.string.isRequired,
      timestamp: PropTypes.number.isRequired,
      price: PropTypes.object.isRequired,
      outcome: PropTypes.string.isRequired,
      trades: PropTypes.array.isRequired
    }).isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      showTrades: false
    };

    this.setShowTrades = this.setShowTrades.bind(this);
  }

  setShowTrades() {
    this.setState({ showTrades: !this.state.showTrades });
  }

  render() {
    const { isMobile, order } = this.props;

    const s = this.state;

    const orderQuantity = formatEther(order.amount).formatted;
    const orderPrice = formatShares(order.price).formatted;
    const orderType = getValue(order, "type");

    return (
      <div className={Styles.FilledOrder__container}>
        <ul
          ref={order => {
            this.order = order;
          }}
          className={
            !isMobile
              ? classNames(SharedStyles.Order, Styles.FilledOrder, {
                  [Styles.FilledOrder__active]: s.showTrades
                })
              : SharedStyles.PortMobile
          }
          onClick={this.setShowTrades}
        >
          <li style={{ position: "relative" }}>
            <div
              className={classNames(SharedStyles.Order__typeIndicator, {
                [SharedStyles.Order__typeIndicatorSell]: orderType === SELL
              })}
            />
            {order.outcome || orderPrice}
          </li>
          <li
            className={classNames(SharedStyles.Order__type, {
              [SharedStyles.Order__typeSell]: orderType === SELL
            })}
            style={{ textTransform: "capitalize" }}
          >
            {orderType}
          </li>
          <li>{orderQuantity}</li>
          <li>{orderPrice}</li>
          <li>
            {convertUnixToFormattedDate(order.timestamp).formattedShortDate}
          </li>
          <li>
            {order.trades.length}
            <ChevronFlip
              className={Styles.FilledOrder__chevron}
              pointDown={!s.showTrades}
            />
          </li>
        </ul>
        {s.showTrades && (
          <div className={TableStyles.MarketOpenOrdersList__table}>
            <ul
              className={classNames(
                TableStyles["MarketOpenOrdersList__table-header"],
                Styles["FilledOrder__table-header"]
              )}
            >
              <li>Filled</li>
              <li>Time Stamp</li>
              <li>Transaction Details</li>
            </ul>
            {order.trades.length > 0 && (
              <div
                className={classNames(
                  TableStyles["MarketOpenOrdersList__table-body"],
                  Styles.FilledOrder__tradeBody
                )}
              >
                {order.trades.map((trade, i) => (
                  <ul
                    className={classNames(
                      SharedStyles.Order,
                      Styles.FilledOrder__trade
                    )}
                  >
                    <li>{formatEther(trade.amount).formatted}</li>
                    <li>
                      {convertUnixToFormattedDate(trade.timestamp).formatted}
                    </li>
                    <li>
                      <button
                        className={Styles.FilledOrder__view}
                        onClick={null}
                      >
                        <EtherscanLink
                          showNonLink
                          txhash={trade.transactionHash}
                          label="View Transaction Details"
                        />
                      </button>
                    </li>
                  </ul>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}
