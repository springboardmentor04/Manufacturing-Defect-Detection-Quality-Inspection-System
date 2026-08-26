import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
// Ports the original chartRegistry/makeChart pattern to a React hook.
// Pass a canvas ref and a Chart.js config; the chart is (re)created whenever
// `config` changes and destroyed on unmount, exactly like the original
// `if (chartRegistry[canvasId]) chartRegistry[canvasId].destroy();` logic.
export function useChart(canvasRef, config) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !config) return undefined;
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    // eslint-disable-next-line no-undef
    chartRef.current = new Chart(canvasRef.current, config);
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(config)]);
}
