import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "12px",
    boxShadow: "0 4px 24px rgb(0 0 0 / 0.10)",
    fontSize: "13px",
    padding: "10px 14px",
  },
  labelStyle: { fontWeight: 600, marginBottom: 4 },
  cursor: { fill: "hsl(var(--muted))", opacity: 0.5 },
};

const AXIS_STYLE = {
  tick: { fontSize: 12, fill: "hsl(var(--muted-foreground))" },
  axisLine: false as const,
  tickLine: false as const,
};

export const CHART_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4"];

interface GradientAreaChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  xKey?: string;
  color?: string;
  height?: number;
  formatter?: (v: number) => string;
}

export function GradientAreaChart({
  data, dataKey, xKey = "name", color = "#f59e0b", height = 220, formatter,
}: GradientAreaChartProps) {
  const id = `grad-${dataKey}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey={xKey} {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} tickFormatter={formatter} width={60} />
        <Tooltip {...TOOLTIP_STYLE} formatter={formatter ? (v: unknown) => formatter(v as number) : undefined} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface GradientBarChartProps {
  data: Record<string, unknown>[];
  bars: { key: string; color: string; label?: string }[];
  xKey?: string;
  height?: number;
  formatter?: (v: number) => string;
}

export function GradientBarChart({
  data, bars, xKey = "name", height = 220, formatter,
}: GradientBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
        <defs>
          {bars.map((b) => (
            <linearGradient key={b.key} id={`bar-${b.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={b.color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={b.color} stopOpacity={0.6} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey={xKey} {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} tickFormatter={formatter} width={60} />
        <Tooltip {...TOOLTIP_STYLE} formatter={formatter ? (v: unknown) => formatter(v as number) : undefined} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {bars.map((b) => (
          <Bar key={b.key} dataKey={b.key} name={b.label ?? b.key} fill={`url(#bar-${b.key})`} radius={[6, 6, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface DonutChartProps {
  data: { name: string; value: number }[];
  height?: number;
  colors?: string[];
}

export function DonutChart({ data, height = 220, colors = CHART_COLORS }: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={3} dataKey="value">
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} strokeWidth={0} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
