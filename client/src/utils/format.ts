export function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

export function formatCurrencyShort(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getRiskColor(label: string): string {
  if (label === 'safe') return 'text-emerald-400';
  if (label === 'caution') return 'text-amber-400';
  return 'text-red-400';
}

export function getRiskBg(label: string): string {
  if (label === 'safe') return 'bg-emerald-500/15 border-emerald-500/40';
  if (label === 'caution') return 'bg-amber-500/15 border-amber-500/40';
  return 'bg-red-500/15 border-red-500/40';
}

export function getSeverityColor(severity: string): string {
  if (severity === 'critical') return 'text-red-400 bg-red-500/10 border-red-500/30';
  if (severity === 'medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
}

export function getConfidenceColor(score: number): string {
  if (score >= 75) return '#10b981';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
}

export function getLiquidityColor(score: number): string {
  if (score >= 65) return '#10b981';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
}
