import classNames from "classnames";
import React from "react";
import PropTypes from "prop-types";
import PeriodSelector from "modules/market-charts/components/market-outcome-charts--candlestick-period-selector/market-outcome-charts--candlestick-period-selector";
import CustomPropTypes from "utils/custom-prop-types";
import * as d3 from "d3";
import ReactFauxDOM from "react-faux-dom";

import { map } from "lodash/fp";
import { sortBy, maxBy } from "lodash";

import findPeriodSeriesBounds from "modules/markets/helpers/find-period-series-bounds";
import { ONE } from "modules/trades/constants/numbers";
// import { BUY, SELL } from "modules/transactions/constants/types";

import Styles from "modules/market-charts/components/market-outcome-charts--candlestick/market-outcome-charts--candlestick.styles";
import StylesHeader from "modules/market-charts/components/market-outcome-charts--header/market-outcome-charts--header.styles";

import { createBigNumber } from "utils/create-big-number";
import { getTickIntervalForRange } from "modules/markets/helpers/range";

class MarketOutcomeCandlestick extends React.Component {
  static propTypes = {
    // currentTimeInSeconds: PropTypes.number,
    fixedPrecision: PropTypes.number.isRequired,
    isMobile: PropTypes.bool,
    // isMobileSmall: PropTypes.bool,
    marketMax: CustomPropTypes.bigNumber.isRequired,
    marketMin: CustomPropTypes.bigNumber.isRequired,
    // outcomeName: PropTypes.string.isRequired,
    priceTimeSeries: PropTypes.array.isRequired,
    selectedPeriod: PropTypes.number.isRequired,
    selectedRange: PropTypes.number.isRequired,
    updateSelectedPeriod: PropTypes.func.isRequired,
    updateSelectedRange: PropTypes.func.isRequired,
    updateSelectedOrderProperties: PropTypes.func.isRequired,
    pricePrecision: PropTypes.number.isRequired
  };

  static defaultProps = {
    // currentTimeInSeconds: null,
    isMobile: false
    // isMobileSmall: false
  };

  static getDerivedStateFromProps(
    {
      currentTimeInSeconds,
      pricePrecision,
      marketMax,
      marketMin,
      priceTimeSeries,
      selectedPeriod,
      selectedRange,
      isMobileSmall
    },
    state
  ) {
    const { candleDim, containerHeight, containerWidth } = state;

    const outcomeBounds = findPeriodSeriesBounds(
      priceTimeSeries,
      marketMin,
      marketMax
    );
    const drawParams = determineDrawParams({
      candleDim,
      containerHeight,
      containerWidth,
      currentTimeInSeconds,
      pricePrecision,
      marketMax,
      marketMin,
      outcomeBounds,
      priceTimeSeries,
      selectedPeriod,
      selectedRange,
      isMobileSmall
    });

    return {
      ...state,
      ...drawParams
    };
  }

  constructor(props) {
    super(props);

    this.state = MarketOutcomeCandlestick.getDerivedStateFromProps(props, {
      candleDim: {
        width: 6,
        gap: 9
      },
      containerHeight: 0,
      containerWidth: 0,
      yScale: null,
      hoveredPrice: null,
      hoveredPeriod: {},
      chart: null
    });

    this.getContainerWidths = this.getContainerWidths.bind(this);
    this.updateContainerWidths = this.updateContainerWidths.bind(this);
    this.updateHoveredPrice = this.updateHoveredPrice.bind(this);
    this.updateHoveredPeriod = this.updateHoveredPeriod.bind(this);
    this.clearCrosshairs = this.clearCrosshairs.bind(this);
    this.drawChart = this.drawChart.bind(this);
  }

  componentDidMount() {
    window.addEventListener("resize", this.updateContainerWidths);
  }

  componentWillReceiveProps(nextProps) {
    const containerWidths = this.getContainerWidths();
    const drawParams = MarketOutcomeCandlestick.getDerivedStateFromProps(
      nextProps,
      {
        ...this.state,
        ...containerWidths
      }
    );

    this.setState({
      ...drawParams
    });
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.updateContainerWidths);
  }

  getContainerWidths() {
    return {
      containerWidth: this.drawContainer.clientWidth,
      containerHeight: this.drawContainer.clientHeight
    };
  }

  updateContainerWidths() {
    this.setState(this.getContainerWidths());
  }

  updateHoveredPrice(hoveredPrice) {
    this.setState({
      hoveredPrice
    });
  }

  updateHoveredPeriod(hoveredPeriod) {
    this.setState({
      hoveredPeriod
    });
  }

  clearCrosshairs() {
    this.updateHoveredPrice(null);
    this.updateHoveredPeriod({});
  }

  drawChart() {
    const candleChartContainer = new ReactFauxDOM.Element("div");
    const {
      pricePrecision,
      marketMax,
      marketMin,
      priceTimeSeries,
      selectedRange,
      updateSelectedOrderProperties
    } = this.props;

    const {
      boundDiff,
      candleDim,
      chartDim,
      containerHeight,
      containerWidth,
      drawableWidth,
      xScale,
      yDomain,
      yScale,
      hoveredPrice
    } = this.state;

    const candleChartSvg = d3.select(candleChartContainer).append("svg");
    const candleChart = candleChartSvg
      .attr("id", "candlestick_chart")
      .attr("height", containerHeight)
      .attr("width", drawableWidth);

    const defs = candleChartSvg.append("defs");
    defs
      .append("filter")
      .attr("id", "dilate-filter")
      .append("feMorphology")
      .attr("operator", "erode")
      .attr("radius", 1)
      .attr("in", "SourceGraphic");

    defs
      .append("mask")
      .attr("class", "candle-mask")
      .attr("id", "candle-mask")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("height", "100%")
      .attr("width", "100%")
      .attr("fill", "white");

    drawTicks({
      boundDiff,
      candleDim,
      candleChartSvg,
      chartDim,
      containerHeight,
      containerWidth,
      pricePrecision,
      marketMax,
      marketMin,
      priceTimeSeries,
      xScale,
      yDomain,
      yScale
    });

    drawCandles({
      boundDiff,
      candleChart,
      candleDim,
      chartDim,
      containerHeight,
      containerWidth,
      priceTimeSeries,
      xScale,
      yDomain,
      yScale
    });

    drawVolume({
      boundDiff,
      candleChart,
      candleDim,
      chartDim,
      containerHeight,
      containerWidth,
      priceTimeSeries,
      xScale,
      yScale
    });

    const tickInterval = getTickIntervalForRange(selectedRange);

    drawXAxisLabels({
      priceTimeSeries,
      candleChart,
      containerWidth,
      containerHeight,
      chartDim,
      candleDim,
      boundDiff,
      tickInterval,
      yDomain,
      xScale
    });

    attachHoverClickHandlers({
      candleChart,
      candleDim,
      chartDim,
      containerHeight,
      containerWidth,
      pricePrecision,
      marketMax,
      marketMin,
      priceTimeSeries,
      updateHoveredPeriod: this.updateHoveredPeriod,
      updateHoveredPrice: this.updateHoveredPrice,
      updateSelectedOrderProperties,
      yScale,
      xScale,
      clearCrosshairs: this.clearCrosshairs
    });

    drawCrosshairs(
      candleChart,
      hoveredPrice,
      yScale,
      containerWidth,
      pricePrecision,
      containerWidth
    );

    return candleChartContainer.toReact();
  }

  render() {
    const {
      fixedPrecision,
      pricePrecision,
      isMobile,
      priceTimeSeries,
      selectedPeriod,
      selectedRange,
      updateSelectedPeriod,
      updateSelectedRange
    } = this.props;

    const { hoveredPeriod } = this.state;

    const chart = this.drawChart();

    return (
      <section className={Styles.MarketOutcomeCandlestick}>
        <section>
          <div
            className={Styles["MarketOutcomeChartsHeader__chart-interaction"]}
          >
            <div
              className={classNames(
                Styles.MarketOutcomeChartsHeader__selector,
                {
                  [Styles[
                    "MarketOutcomeChartsHeader__selector--mobile"
                  ]]: isMobile
                }
              )}
            >
              <PeriodSelector
                priceTimeSeries={priceTimeSeries}
                updateSelectedPeriod={updateSelectedPeriod}
                updateSelectedRange={updateSelectedRange}
                selectedPeriod={selectedPeriod}
                selectedRange={selectedRange}
              />
            </div>
            <div
              className={classNames(
                StylesHeader.MarketOutcomeChartsHeader__stats,
                Styles.MarketOutcomeChartsHeader__stats
              )}
            >
              <span
                className={classNames(
                  StylesHeader.MarketOutcomeChartsHeader__stat,
                  Styles.MarketOutcomeChartsHeader__stat
                )}
              >
                <span
                  className={Styles[`MarketOutcomeChartsHeader__stat-title`]}
                >
                  o:
                </span>
                <span
                  className={Styles[`MarketOutcomeChartsHeader__stat-value`]}
                >
                  {hoveredPeriod.open ? (
                    hoveredPeriod.open.toFixed(pricePrecision).toString()
                  ) : (
                    <span>&mdash;</span>
                  )}
                </span>
              </span>
              <span
                className={classNames(
                  StylesHeader.MarketOutcomeChartsHeader__stat,
                  Styles.MarketOutcomeChartsHeader__stat
                )}
              >
                <span
                  className={Styles[`MarketOutcomeChartsHeader__stat-title`]}
                >
                  c:
                </span>
                <span
                  className={Styles[`MarketOutcomeChartsHeader__stat-value`]}
                >
                  {hoveredPeriod.close ? (
                    hoveredPeriod.close.toFixed(pricePrecision).toString()
                  ) : (
                    <span>&mdash;</span>
                  )}
                </span>
              </span>
              <span
                className={classNames(
                  StylesHeader.MarketOutcomeChartsHeader__stat,
                  Styles.MarketOutcomeChartsHeader__stat
                )}
              >
                <span
                  className={Styles[`MarketOutcomeChartsHeader__stat-title`]}
                >
                  h:
                </span>
                <span
                  className={Styles[`MarketOutcomeChartsHeader__stat-value`]}
                >
                  {hoveredPeriod.high ? (
                    hoveredPeriod.high.toFixed(pricePrecision).toString()
                  ) : (
                    <span>&mdash;</span>
                  )}
                </span>
              </span>
              <span
                className={classNames(
                  StylesHeader.MarketOutcomeChartsHeader__stat,
                  Styles.MarketOutcomeChartsHeader__stat
                )}
              >
                <span
                  className={Styles[`MarketOutcomeChartsHeader__stat-title`]}
                >
                  l:
                </span>
                <span
                  className={Styles[`MarketOutcomeChartsHeader__stat-value`]}
                >
                  {hoveredPeriod.low ? (
                    hoveredPeriod.low.toFixed(pricePrecision).toString()
                  ) : (
                    <span>&mdash;</span>
                  )}
                </span>
              </span>
              <span
                className={classNames(
                  StylesHeader.MarketOutcomeChartsHeader__stat,
                  Styles.MarketOutcomeChartsHeader__stat
                )}
              >
                <span
                  className={Styles[`MarketOutcomeChartsHeader__stat-title`]}
                >
                  v:
                </span>
                <span
                  className={Styles[`MarketOutcomeChartsHeader__stat-value`]}
                >
                  {hoveredPeriod.volume ? (
                    hoveredPeriod.volume.toFixed(fixedPrecision).toString()
                  ) : (
                    <span>&mdash;</span>
                  )}
                </span>
              </span>
            </div>
          </div>
        </section>
        <div
          ref={drawContainer => {
            this.drawContainer = drawContainer;
          }}
          className={Styles.MarketOutcomeCandlestick__container}
        >
          {chart}
        </div>
      </section>
    );
  }
}

function determineDrawParams({
  containerHeight,
  containerWidth,
  currentTimeInSeconds,
  marketMax,
  marketMin,
  priceTimeSeries,
  selectedRange,
  isMobileSmall
}) {
  // Dimensions/Positioning
  const chartDim = {
    top: 5,
    bottom: 30,
    right: 70,
    left: isMobileSmall ? 20 : 10,
    stick: 5,
    tickOffset: 70
  };

  // Domain
  //  X
  const xDomain = [
    new Date((currentTimeInSeconds - selectedRange) * 1000),
    new Date(currentTimeInSeconds * 1000)
  ];

  //  Y
  const highValues = sortBy(priceTimeSeries, ["high"]);
  const lowValues = sortBy(priceTimeSeries, ["low"]);
  const max = highValues.length
    ? highValues[highValues.length - 1].high
    : marketMax.toNumber();
  const min = lowValues.length ? lowValues[0].low : marketMin.toNumber();

  const bnMax = createBigNumber(max);
  const bnMin = createBigNumber(min);
  const priceRange = bnMax.minus(bnMin);
  const buffer = priceRange.times(".10");
  const marketPriceRange = marketMax.minus(marketMin).dividedBy(2);
  const ltHalfRange = marketPriceRange.gt(priceRange);
  const maxPrice = ltHalfRange
    ? bnMax.plus(marketPriceRange)
    : bnMax.plus(buffer);
  const minPrice = ltHalfRange
    ? bnMin.minus(marketPriceRange)
    : bnMin.minus(buffer);

  let yDomain = [
    (maxPrice.gt(marketMax) ? marketMax : maxPrice).toNumber(),
    (minPrice.lt(marketMin) ? marketMin : minPrice).toNumber()
  ];

  // common case with low volume
  if (yDomain[0] === yDomain[1]) {
    if (yDomain[0] === 0) {
      yDomain = [marketMax.toNumber(), marketMin.toNumber()];
    } else {
      yDomain = [
        createBigNumber(yDomain[0])
          .times(1.5)
          .toNumber(),
        createBigNumber(yDomain[0])
          .times(0.5)
          .toNumber()
      ];
    }
  }

  // sigment y into 10 to show prices
  const boundDiff = createBigNumber(yDomain[0])
    .minus(createBigNumber(yDomain[1]))
    .dividedBy(2);

  // Scale
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(xDomain))
    .range([chartDim.left, containerWidth - chartDim.left - chartDim.right]);

  const yScale = d3
    .scaleLinear()
    .clamp(true)
    .domain(d3.extent(yDomain))
    .range([containerHeight - chartDim.bottom, chartDim.top]);

  return {
    chartDim,
    drawableWidth: containerWidth,
    boundDiff,
    yDomain,
    xScale,
    yScale
  };
}

function drawTicks({
  boundDiff,
  candleChartSvg,
  chartDim,
  containerWidth,
  pricePrecision,
  xScale,
  yScale
}) {
  const [x1, x2] = xScale.range();
  //  Ticks
  const offsetTicks = yScale.ticks(3);

  candleChartSvg
    .selectAll("line")
    .data(offsetTicks)
    .enter()
    .append("line")
    .attr("class", "tick-line")
    .attr("x1", x1)
    .attr("x2", x2)
    .attr("y1", d => yScale(d))
    .attr("y2", d => yScale(d));

  candleChartSvg
    .selectAll("text")
    .data(offsetTicks)
    .enter()
    .append("text")
    .attr("class", "tick-value")
    .attr("x", containerWidth)
    .attr("y", d => yScale(d))
    .attr("dx", 0)
    .attr("dy", chartDim.tickOffset)
    .text(d => `${d.toFixed(pricePrecision)} ETH`);
}

function drawCandles({
  priceTimeSeries,
  candleChart,
  containerWidth,
  containerHeight,
  candleDim,
  xScale,
  yScale
}) {
  if (priceTimeSeries.length === 0) {
    drawNullState({ candleChart, containerWidth, containerHeight });
  } else {
    candleChart
      .select("mask.candle-mask")
      .selectAll("rect.candle-mask-rect")
      .data(priceTimeSeries)
      .enter()
      .append("rect")
      .attr("class", "candle-mask-rect")
      .attr("x", d => xScale(d.period))
      .attr("y", d => yScale(d3.max([d.open, d.close])))
      .attr("height", d =>
        Math.max(Math.abs(yScale(d.open) - yScale(d.close)), 1)
      )
      .attr("width", candleDim.width)
      .attr("fill", "Black");

    candleChart
      .selectAll("rect.candle")
      .data(priceTimeSeries)
      .enter()
      .append("rect")
      .attr("x", d => xScale(d.period))
      .attr("y", d => yScale(d3.max([d.open, d.close])))
      .attr("height", d =>
        Math.max(Math.abs(yScale(d.open) - yScale(d.close)), 1)
      )
      .attr("width", candleDim.width)
      .attr("class", d => (d.close > d.open ? "up-period" : "down-period"));

    candleChart
      .selectAll("rect.stem")
      .data(priceTimeSeries)
      .enter()
      .append("rect")
      .attr("class", "stem")
      .attr("x", d => xScale(d.period) + candleDim.width / 2)
      .attr("width", 1)
      .attr("y", d => yScale(d.high))
      .attr("height", d => yScale(d.low) - yScale(d.high))
      .attr("class", d => (d.close > d.open ? "up-period" : "down-period"));
  }
}

function drawVolume({
  priceTimeSeries,
  candleChart,
  containerHeight,
  chartDim,
  candleDim,
  xScale,
  yScale,
  containerWidth
}) {
  const yVolumeDomain = [0, ...map("volume")(priceTimeSeries)];
  const [yMax] = yScale.range();
  const yVolumeScale = d3
    .scaleLinear()
    .domain(d3.extent(yVolumeDomain))
    .range([yMax, yMax * 0.85]);

  candleChart
    .selectAll("rect.volume")
    .data(priceTimeSeries)
    .enter()
    .append("rect")
    .attr("x", d => xScale(d.period))
    .attr("y", d => yVolumeScale(d.volume))
    .attr("height", d => yMax - yVolumeScale(d.volume))
    .attr("width", d => candleDim.width)
    .attr("class", "period-volume");

  const maxVolume = maxBy(priceTimeSeries, v => v.volume);
  if (!maxVolume || maxVolume.volume === 0) return;

  const volumeTicks = [maxVolume, { volume: maxVolume.volume / 2 }];

  candleChart
    .selectAll("text")
    .data(volumeTicks)
    .enter()
    .append("text")
    .attr("class", "tick-value-volume")
    .attr("x", containerWidth - 110)
    .attr("y", d => yVolumeScale(d.volume) - 4)
    .text(d => {
      if (createBigNumber(d.volume).gte(ONE)) {
        return d.volume.toFixed(1) + ` ETH`;
      }
      return d.volume.toFixed(4) + ` ETH`;
    });
}

function drawXAxisLabels({
  candleChart,
  containerHeight,
  chartDim,
  tickInterval,
  xScale
}) {
  candleChart
    .append("g")
    .attr("id", "candlestick-x-axis")
    .attr("transform", `translate(0, ${containerHeight - chartDim.bottom})`)
    .call(tickInterval(d3.axisBottom(xScale)));

  candleChart
    .select(`#candlestick-x-axis`)
    .attr("font", null)
    .attr("font-family", null)
    .attr("font-size", null)
    .attr("text-anchor", null);

  candleChart.selectAll(".tick text").attr("fill", null);
}

function attachHoverClickHandlers({
  candleChart,
  candleDim,
  chartDim,
  containerHeight,
  drawableWidth,
  pricePrecision,
  marketMax,
  marketMin,
  priceTimeSeries,
  updateHoveredPeriod,
  updateHoveredPrice,
  updateSelectedOrderProperties,
  yScale,
  xScale,
  clearCrosshairs
}) {
  candleChart
    .append("rect")
    .attr("class", "overlay")
    .attr("width", drawableWidth)
    .attr("height", containerHeight)
    .on("mousemove", () =>
      updateHoveredPrice(
        yScale
          .invert(d3.mouse(d3.select("#candlestick_chart").node())[1])
          .toFixed(pricePrecision)
      )
    )
    .on("mouseout", clearCrosshairs);

  candleChart
    .selectAll("rect.hover")
    .data(priceTimeSeries)
    .enter()
    .append("rect")
    .attr("x", d => xScale(d.period) - candleDim.gap * 0.5)
    .attr("y", 0)
    .attr("height", containerHeight - chartDim.bottom)
    .attr("width", candleDim.width + candleDim.gap)
    .attr("class", "period-hover")
    .on("mouseover", d => updateHoveredPeriod(d))
    .on("mousemove", () =>
      updateHoveredPrice(
        yScale
          .invert(d3.mouse(d3.select("#candlestick_chart").node())[1])
          .toFixed(pricePrecision)
      )
    )
    .on("mouseout", clearCrosshairs);

  candleChart.on("mouseout", clearCrosshairs);
}

function drawCrosshairs(
  candleChart,
  hoveredPrice,
  yScale,
  chartWidth,
  pricePrecision,
  containerWidth
) {
  if (hoveredPrice != null) {
    const yPosition = yScale(hoveredPrice);
    const clampedHoveredPrice = yScale.invert(yPosition);

    candleChart
      .append("g")
      .attr("id", "candlestick_crosshairs")
      .attr("class", "line")
      .attr("x1", 0)
      .attr("y1", yPosition)
      .attr("x2", chartWidth)
      .attr("y2", yPosition)
      .append("line")
      .attr("id", "candlestick_crosshairY")
      .attr("class", "crosshair");
    candleChart
      .append("foreignObject")
      .attr("id", "hovered_candlestick_price_label")
      .attr("x", containerWidth + 4)
      .attr("y", yScale(hoveredPrice) - 12)
      .html(`${clampedHoveredPrice.toFixed(pricePrecision)} ETH`);
  }
}

function drawNullState(options) {
  const { containerWidth, containerHeight, candleChart } = options;

  candleChart
    .append("text")
    .attr("class", Styles["MarketOutcomeCandlestick__null-message"])
    .attr("x", containerWidth / 2)
    .attr("y", containerHeight / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .text("No Completed Trades");
}

export default MarketOutcomeCandlestick;
