// Simple SVG chart components

export function donutChart({ value, max, size = 80, strokeWidth = 8, color = 'var(--accent)', label = '' }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  return `
    <div class="donut-chart" style="width: ${size}px; height: ${size}px;">
      <svg viewBox="0 0 ${size} ${size}">
        <circle 
          cx="${size / 2}" 
          cy="${size / 2}" 
          r="${radius}"
          fill="none"
          stroke="var(--bg-tertiary)"
          stroke-width="${strokeWidth}"
        />
        <circle 
          class="donut-progress"
          cx="${size / 2}" 
          cy="${size / 2}" 
          r="${radius}"
          fill="none"
          stroke="${color}"
          stroke-width="${strokeWidth}"
          stroke-linecap="round"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          transform="rotate(-90 ${size / 2} ${size / 2})"
        />
      </svg>
      <div class="donut-center">
        <span class="donut-value">${Math.round(percentage)}%</span>
        ${label ? `<span class="donut-label">${label}</span>` : ''}
      </div>
    </div>
  `;
}

export function barChart({ data, height = 120, barWidth = 24, gap = 8, showLabels = true }) {
  if (!data || data.length === 0) return '<div class="chart-empty">No data</div>';
  
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const chartWidth = data.length * (barWidth + gap) - gap;
  
  const bars = data.map((d, i) => {
    const barHeight = (d.value / maxValue) * (height - 24);
    const x = i * (barWidth + gap);
    const y = height - barHeight - 20;
    const color = d.color || 'var(--accent)';
    
    return `
      <g class="bar-group">
        <rect 
          x="${x}" 
          y="${y}" 
          width="${barWidth}" 
          height="${barHeight}"
          rx="4"
          fill="${color}"
          class="chart-bar"
        />
        ${showLabels ? `
          <text 
            x="${x + barWidth / 2}" 
            y="${height - 4}" 
            text-anchor="middle" 
            class="chart-label"
          >${d.label || ''}</text>
        ` : ''}
      </g>
    `;
  }).join('');
  
  return `
    <svg class="bar-chart" viewBox="0 0 ${chartWidth} ${height}" preserveAspectRatio="xMidYMid meet">
      ${bars}
    </svg>
  `;
}

export function sparkline({ data, width = 100, height = 32, color = 'var(--accent)', fill = true }) {
  if (!data || data.length < 2) return '';
  
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  
  const fillPath = fill ? `
    <polygon 
      points="0,${height} ${points} ${width},${height}" 
      fill="url(#sparkline-gradient)"
      opacity="0.2"
    />
  ` : '';
  
  return `
    <svg class="sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${fillPath}
      <polyline 
        points="${points}" 
        fill="none" 
        stroke="${color}" 
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;
}

export function progressBar({ value, max, height = 8, color = 'var(--accent)', showLabel = false }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colorClass = percentage >= 90 ? 'danger' : percentage >= 70 ? 'warning' : '';
  const barColor = colorClass === 'danger' ? 'var(--danger)' : colorClass === 'warning' ? 'var(--warning)' : color;
  
  return `
    <div class="progress-bar-container">
      ${showLabel ? `<span class="progress-label">${Math.round(percentage)}%</span>` : ''}
      <div class="progress-bar" style="height: ${height}px;">
        <div class="progress-fill ${colorClass}" style="width: ${percentage}%; background: ${barColor};"></div>
      </div>
    </div>
  `;
}

export function statCard({ title, value, subtitle, icon, trend, trendValue, chart }) {
  const trendClass = trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : '';
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
  
  return `
    <div class="stat-card card">
      <div class="stat-header">
        ${icon ? `<div class="stat-icon">${icon}</div>` : ''}
        <div class="stat-info">
          <span class="stat-title">${title}</span>
          <span class="stat-value">${value}</span>
          ${subtitle ? `<span class="stat-subtitle">${subtitle}</span>` : ''}
        </div>
        ${trendValue ? `<span class="stat-trend ${trendClass}">${trendIcon} ${trendValue}</span>` : ''}
      </div>
      ${chart ? `<div class="stat-chart">${chart}</div>` : ''}
    </div>
  `;
}
