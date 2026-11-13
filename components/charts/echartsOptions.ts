// components/charts/echartsOptions.ts
//
// Fuente única de verdad para las opciones (option) de las gráficas ECharts.
// Lo comparten la versión web (echarts-for-react) y la versión nativa
// (WebView + echarts.min.js). Por eso el objeto que produce debe ser lo más
// serializable posible: las únicas funciones son las de `tooltip`/`axisLabel`,
// que en el puente WebView se re-aplican en el script del HTML (los formatters
// con formato COP), y `JSON.stringify` las descarta de forma natural.

export const CHART_PALETTE = [
  "#4b9aff",
  "#4be0a6",
  "#ff8890",
  "#a78bfa",
  "#fbbf24",
  "#818cf8",
];

export const INCOME_COLOR = "#4be0a6";
export const EXPENSE_COLOR = "#ff8890";

export const GLASS_TOOLTIP = {
  backgroundColor: "rgba(15, 23, 42, 0.92)",
  borderColor: "rgba(255, 255, 255, 0.12)",
  borderWidth: 1,
  padding: [10, 12],
  textStyle: { color: "#e2e8f0", fontSize: 12 },
  extraCssText:
    "backdrop-filter: blur(10px); border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.35);",
};

export const formatCOP = (value: number) =>
  `$${Number(value).toLocaleString("es-CO")}`;

export const formatCompactCOP = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}Md`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}k`;
  return `$${Math.round(value)}`;
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const value = hex.replace("#", "");
  const full =
    value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const int = parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const barGradient = (color: string) => ({
  type: "linear",
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: hexToRgba(color, 0.55) },
    { offset: 1, color },
  ],
});

export interface TopEntry {
  id: string;
  name: string;
  value: number;
}

export const buildExpenseChartOption = (
  topEntries: TopEntry[],
  typeTransaction: string,
) => ({
  backgroundColor: "transparent",
  grid: { left: 4, right: 12, top: 12, bottom: 4, containLabel: true },
  tooltip: {
    ...GLASS_TOOLTIP,
    trigger: "axis",
    axisPointer: {
      type: "shadow",
      shadowStyle: { color: "rgba(255,255,255,0.04)" },
    },
    formatter: (params: any) => {
      const target = Array.isArray(params) ? params[0] : params;
      return `<span style="color:#94a3b8">${target.name}</span><br/><b style="font-size:14px">${formatCOP(target.value)}</b>`;
    },
  },
  xAxis: {
    type: "category",
    data: topEntries.map((e) => e.name),
    axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
    axisTick: { show: false },
    axisLabel: {
      color: "#94a3b8",
      fontSize: 10,
      interval: 0,
      ...(topEntries.length > 4 ? { rotate: 24 } : {}),
    },
  },
  yAxis: {
    type: "value",
    splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
    axisLabel: {
      color: "#94a3b8",
      fontSize: 10,
      formatter: (v: number) => formatCompactCOP(v),
    },
  },
  series: [
    {
      name: typeTransaction,
      type: "bar",
      data: topEntries.map((e, i) => ({
        value: e.value,
        itemStyle: {
          color: barGradient(CHART_PALETTE[i % CHART_PALETTE.length]),
        },
      })),
      barMaxWidth: 42,
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
      },
    },
  ],
});

export const buildIncomeVsExpenseOption = (
  income: number,
  expense: number,
) => {
  const total = income + expense;
  if (total <= 0) return null;

  return {
    backgroundColor: "transparent",
    tooltip: {
      ...GLASS_TOOLTIP,
      trigger: "item",
      formatter: (params: any) =>
        `${params.name}<br/><b style="font-size:14px">${formatCOP(params.value)}</b><br/><span style="color:#94a3b8">${params.percent}%</span>`,
    },
    title: {
      text: formatCompactCOP(total),
      subtext: "Total",
      left: "center",
      top: "center",
      textStyle: { color: "#f8fafc", fontSize: 18, fontWeight: 700 },
      subtextStyle: { color: "#94a3b8", fontSize: 12 },
    },
    series: [
      {
        name: "Ingresos vs Gastos",
        type: "pie",
        radius: ["64%", "86%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: "rgba(255,255,255,0.08)",
          borderWidth: 2,
        },
        label: { show: false },
        labelLine: { show: false },
        emphasis: { scaleSize: 5 },
        data: [
          {
            value: income,
            name: "Ingresos",
            itemStyle: { color: INCOME_COLOR },
          },
          {
            value: expense,
            name: "Gastos",
            itemStyle: { color: EXPENSE_COLOR },
          },
        ],
      },
    ],
  };
};
