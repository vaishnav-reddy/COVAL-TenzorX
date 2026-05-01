import { motion } from 'framer-motion';

interface GaugeChartProps {
  value: number;
  label?: string;
  color?: string;
  size?: number;
}

export function GaugeChart({ value, label, color = '#6366f1', size = 140 }: GaugeChartProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center relative">
      <svg width={size} height={size / 2 + strokeWidth} viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}>
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={0}
          transform={`rotate(180 ${center} ${center})`}
        />
        <motion.circle
          cx={center} cy={center} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          transform={`rotate(180 ${center} ${center})`}
        />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-1">
        <motion.span
          className="text-3xl font-bold text-gray-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {value}
        </motion.span>
        {label && <span className="text-xs text-gray-400">{label}</span>}
      </div>
    </div>
  );
}
