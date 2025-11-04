// app/dashboard/soko/components/charts/LineChart.tsx
interface LineChartProps {
  data: any[];
  dataKey: string;
  color: string;
}

export default function LineChart({ data, dataKey, color }: LineChartProps) {
  if (!data || data.length === 0) return null;
  
  const values = data.map(d => d[dataKey] || 0);
  const max = Math.max(...values, 1);
  const height = 200;
  const width = 600;
  const padding = 40;
  
  if (data.length === 1) {
    const x = width / 2;
    const y = height - padding - ((values[0] / max) * (height - 2 * padding));
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <circle cx={x} cy={y} r="4" fill={color} />
      </svg>
    );
  }
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d[dataKey] || 0) / max) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((d[dataKey] || 0) / max) * (height - 2 * padding);
        if (isNaN(x) || isNaN(y)) return null;
        return (
          <circle key={i} cx={x} cy={y} r="4" fill={color} />
        );
      })}
    </svg>
  );
}
