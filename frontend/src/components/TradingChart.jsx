import { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

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

export default function TradingChart({ candles, onNewCandle }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

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
        scaleMargins: { top: 0.1, bottom: 0.2 },
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
    return onNewCandle((candle) => {
      seriesRef.current?.update(candle);
    });
  }, [onNewCandle]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: CHART_COLORS.background }}
    />
  );
}
