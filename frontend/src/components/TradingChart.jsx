import { useEffect, useRef } from 'react';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';

const CHART_COLORS = {
  background: '#12141a',
  text: '#8b8fa8',
  grid: '#1e2130',
  border: '#2a2d3e',
  upColor: '#00d084',
  downColor: '#ff4466',
  wickUp: '#00d084',
  wickDown: '#ff4466',
};

function priceFormatter(price) {
  if (!price || price === 0) return '0';
  if (price < 0.000001) return price.toExponential(3);
  if (price < 0.0001) return price.toFixed(8);
  if (price < 0.01) return price.toFixed(6);
  if (price < 1) return price.toFixed(5);
  return price.toFixed(4);
}

export default function TradingChart({ candles, onNewCandle, onCandleTick, tpOrders = [], entryPrice = null }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLines = useRef(new Map()); // orderId → priceLine object
  const entryLine  = useRef(null);       // single entry price line

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.background },
        textColor: CHART_COLORS.text,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: {
        vertLine: { color: 'rgba(124, 94, 247, 0.5)', width: 1, style: 1 },
        horzLine: { color: 'rgba(124, 94, 247, 0.5)', width: 1, style: 1 },
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.border,
        scaleMargins: { top: 0.08, bottom: 0.15 },
        minimumWidth: 90,
      },
      timeScale: {
        borderColor: CHART_COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const series = chart.addCandlestickSeries({
      upColor: CHART_COLORS.upColor,
      downColor: CHART_COLORS.downColor,
      borderUpColor: CHART_COLORS.upColor,
      borderDownColor: CHART_COLORS.downColor,
      wickUpColor: CHART_COLORS.wickUp,
      wickDownColor: CHART_COLORS.wickDown,
      priceFormat: {
        type: 'custom',
        minMove: 0.000000001,
        formatter: priceFormatter,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      priceLines.current.clear();
      entryLine.current = null;
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !candles?.length) return;
    seriesRef.current.setData(candles);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    if (!onNewCandle) return;
    return onNewCandle((candle) => seriesRef.current?.update(candle));
  }, [onNewCandle]);

  // Live forming-candle ticks — updates the rightmost bar in real-time
  useEffect(() => {
    if (!onCandleTick) return;
    return onCandleTick((candle) => seriesRef.current?.update(candle));
  }, [onCandleTick]);

  // Entry price line — shows user's avg buy price on the chart
  useEffect(() => {
    if (!seriesRef.current) return;
    const series = seriesRef.current;

    if (entryPrice && entryPrice > 0) {
      if (entryLine.current) {
        try { entryLine.current.applyOptions({ price: entryPrice }); } catch {}
      } else {
        try {
          entryLine.current = series.createPriceLine({
            price: entryPrice,
            color: '#4dabf7',
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: 'Entry',
          });
        } catch {}
      }
    } else {
      if (entryLine.current) {
        try { series.removePriceLine(entryLine.current); } catch {}
        entryLine.current = null;
      }
    }
  }, [entryPrice]);

  // Sync TP price lines with orders
  useEffect(() => {
    if (!seriesRef.current) return;
    const series = seriesRef.current;
    const currentIds = new Set(tpOrders.map((o) => o.id));

    // Remove lines for cancelled/executed orders
    for (const [id, line] of priceLines.current) {
      if (!currentIds.has(id)) {
        try { series.removePriceLine(line); } catch {}
        priceLines.current.delete(id);
      }
    }

    // Add/update lines for open orders
    for (const order of tpOrders) {
      if (priceLines.current.has(order.id)) {
        // Update existing line
        try {
          priceLines.current.get(order.id).applyOptions({ price: order.target_price });
        } catch {}
      } else {
        // Create new line
        try {
          const line = series.createPriceLine({
            price: order.target_price,
            color: '#f5a623',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `TP ${priceFormatter(order.target_price)}`,
          });
          priceLines.current.set(order.id, line);
        } catch {}
      }
    }
  }, [tpOrders]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: CHART_COLORS.background }} />
  );
}
