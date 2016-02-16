let React = require('react');

let BigNumber = require("bignumber.js");
let abi = require("augur-abi");
let Fluxxor = require("fluxxor");
let FluxMixin = Fluxxor.FluxMixin(React);
let StoreWatchMixin = Fluxxor.StoreWatchMixin;
let Button = require('react-bootstrap/lib/Button');

let Breadcrumb = require('./Breadcrumb.jsx');
let MarketInfo = require('./MarketInfo.jsx');
let TradeTab = require('./TradeTab.jsx');
let StatsTab = require('./StatsTab');
let RulesTab = require('./RulesTab');
let UserTradesTab = require('./UserTradesTab');
let UserFrozenFundsTab = require('./UserFrozenFundsTab');
let CloseMarketModal = require("../CloseMarket");


let MarketPage = React.createClass({
    mixins: [FluxMixin, StoreWatchMixin('branch', 'market', 'config')],

    getInitialState() {
        return {
            metadataTimeout: null,
            priceHistoryTimeout: null,
            orderBookTimeout: null,
            addMarketModalOpen: false
        };
    },

    getStateFromFlux() {
        let flux = this.getFlux();

        let marketId = new BigNumber(this.props.params.marketId, 16);
        let market = flux.store('market').getMarket(marketId);
        let currentBranch = flux.store('branch').getCurrentBranch();
        let account = flux.store('config').getAccount();
        let handle = flux.store('config').getHandle();
        let blockNumber = flux.store('network').getState().blockNumber;

        if (currentBranch && market && market.tradingPeriod &&
            currentBranch.currentPeriod >= market.tradingPeriod.toNumber()) {
            market.matured = true;
            if (currentBranch.reportPeriod > market.tradingPeriod.toNumber()) {
                market.closable = true;
            }
        }

        return {
            market,
            account,
            handle,
            blockNumber
        };
    },
    componentDidMount() {
        this.getMetadata();
        this.checkOrderBook();
        this.getPriceHistory();

        this.stylesheetEl = document.createElement("link");
        this.stylesheetEl.setAttribute("rel", "stylesheet");
        this.stylesheetEl.setAttribute("type", "text/css");
        this.stylesheetEl.setAttribute("href", "/css/market-detail.css");
        document.getElementsByTagName("head")[0].appendChild(this.stylesheetEl);
    },
    componentWillUnmount() {
        this.stylesheetEl.remove();

        clearTimeout(this.state.priceHistoryTimeout);
        clearTimeout(this.state.orderBookTimeout);
    },

    getMetadata() {
        let market = this.state.market;
        if (this.state.metadataTimeout) {
            clearTimeout(this.state.metadataTimeout);
        }
        if (market && market.constructor === Object && market._id &&
            !market.metadata) {
            console.info("load metadata from IPFS...");
            return this.getFlux().actions.market.loadMetadata(market);
        }
        this.setState({metadataTimeout: setTimeout(this.getMetadata, 5000)});
    },

    checkOrderBook() {
        console.info("checking order book...");
        let market = this.state.market;
        if (this.state.orderBookTimeout) {
            clearTimeout(this.state.orderBookTimeout);
        }
        if (market && market.constructor === Object && market._id &&
            !market.orderBookChecked) {
            return this.getFlux().actions.market.checkOrderBook(market);
        }
        this.setState({orderBookTimeout: setTimeout(this.checkOrderBook, 5000)});
    },

    getPriceHistory() {
        let market = this.state.market;
        if (this.state.priceHistoryTimeout) {
            clearTimeout(this.state.priceHistoryTimeout);
        }
        if (market && market.constructor === Object && market._id &&
            !market.priceHistory && !market.priceHistoryStatus) {
            console.info("loading price history...");
            return this.getFlux().actions.market.loadPriceHistory(market);
        }
        this.setState({priceHistoryTimeout: setTimeout(this.getPriceHistory, 5000)});
    },

    toggleCloseMarketModal(event) {
        this.setState({closeMarketModalOpen: !this.state.closeMarketModalOpen});
    },

    render() {
        let market = this.state.market;

        if (market == null) {
            return (
                <div>No market info</div>
            );
        }

        var closeMarketButton = <span />;
        if (market.matured && market.closable && !market.closed) {
             closeMarketButton = (
                <div className="close-market">
                    <Button
                        bsSize="small"
                        bsStyle="info"
                        onClick={this.toggleCloseMarketModal}>
                        Close Market
                    </Button>
                    <CloseMarketModal
                        text="close market"
                        params={{market: market}}
                        show={this.state.closeMarketModalOpen}
                        onHide={this.toggleCloseMarketModal} />
                </div>
            );
        }

        return (
            <div className="marketPage">
                <Breadcrumb market={market}/>
                <MarketInfo market={market}/>
                {closeMarketButton}

                <div role="tabpanel" style={{marginTop: '15px'}}>
                    <div className="row submenu">
                        <a className="collapsed" data-toggle="collapse" href="#collapseSubmenu"
                           aria-expanded="false"
                           aria-controls="collapseSubmenu">
                            <h2>Navigation</h2>
                        </a>

                        <div id="collapseSubmenu" className="col-xs-12 collapse" aria-expanded="false">
                            <ul className="list-group" role="tablist" id="tabpanel">
                                <li role="presentation" className="list-group-item active">
                                    <a role="tab" href="#tradeTab" data-toggle="tab">Trade</a>
                                </li>
                                <li role="presentation" className="list-group-item">
                                    <a role="tab" href="#statsTab" data-toggle="tab">Stats & Charts</a>
                                </li>
                                <li role="presentation" className="list-group-item">
                                    <a role="tab" href="#rulesTab" data-toggle="tab">Rules</a>
                                </li>
                                <li role="presentation" className="list-group-item">
                                    <a role="tab" href="#userTradesTab" data-toggle="tab">
                                        My Trades
                                    </a>
                                </li>
                                <li role="presentation" className="list-group-item">
                                    <a role="tab" href="#userFrozenFundsTab" data-toggle="tab">
                                        Frozen Funds
                                        {/*<span ng-show="app.balance.eventMargin != null">
                                        (<span ng-bind="app.balance.eventMarginFormatted"></span>)
                                    </span>*/}
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="tab-content">
                        <div id="tradeTab" className="tab-pane active" role="tabpanel">
                            <TradeTab
                                market={this.state.market}
                                account={this.state.account}
                                handle={this.state.handle}
                                toggleSignInModal={this.props.toggleSignInModal}
                                />
                        </div>
                        <div id="statsTab" className="tab-pane" role="tabpanel">
                            <StatsTab
                                market={this.state.market}
                                blockNumber={this.state.blockNumber}
                                />
                        </div>
                        <div id="rulesTab" className="tab-pane" role="tabpanel">
                            <RulesTab/>
                        </div>
                        <div id="userTradesTab" className="tab-pane" role="tabpanel">
                            <UserTradesTab/>
                        </div>
                        <div id="userFrozenFundsTab" className="tab-pane" role="tabpanel">
                            <UserFrozenFundsTab/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = MarketPage;