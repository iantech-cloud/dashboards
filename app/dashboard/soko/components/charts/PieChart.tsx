// app/dashboard/soko/components/charts/PieChart.tsx
interface PieChartProps {
  data: Array<{ name: string, value: number, color: string }>;
}

export default function PieChart({ data }: PieChartProps) {
  if (!data || data.length === 0) return null;
  
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  if (total === 0) return (
    <div className="text-center py-8">
      <p className="text-sm text-gray-500">No data to display</p>
    </div>
  );
  
  const size = 200;
  const center = size / 2;
  const radius = 80;
  let cumulativePercent = 0;
  
  const createArc = (startPercent: number, endPercent: number) => {
    const startAngle = startPercent * 2 * Math.PI - Math.PI / 2;
    const endAngle = endPercent * 2 * Math.PI - Math.PI / 2;
    
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    
    const largeArc = endPercent - startPercent > 0.5 ? 1 : 0;
    
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };
  
  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          const percent = d.value / total;
          const startPercent = cumulativePercent;
          const endPercent = cumulativePercent + percent;
          cumulativePercent = endPercent;
          
          return (
            <path
              key={i}
              d={createArc(startPercent, endPercent)}
              fill={d.color}
              stroke="white"
              strokeWidth="2"
            />
          );
        })}
        <circle cx={center} cy={center} r="50" fill="white" />
        <text 
          x={center} 
          y={center} 
          textAnchor="middle" 
          dominantBaseline="middle"
          className="text-lg font-bold fill-gray-700"
        >
          {data.length}
        </text>
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-sm text-gray-700 truncate max-w-[200px]">{d.name}</span>
            <span className="text-sm font-semibold text-gray-900 ml-auto">
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
