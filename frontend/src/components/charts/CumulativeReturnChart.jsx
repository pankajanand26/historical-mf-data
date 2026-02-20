import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { CHART_COLORS } from '../../utils/constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const CumulativeReturnChart = ({ cumulativeReturns }) => {
  if (!cumulativeReturns || Object.keys(cumulativeReturns).length === 0) {
    return null;
  }

  const amcNames = Object.keys(cumulativeReturns);
  const allDates = new Set();
  
  amcNames.forEach((amc) => {
    cumulativeReturns[amc].forEach((point) => {
      allDates.add(point.date);
    });
  });

  const sortedDates = Array.from(allDates).sort();

  const datasets = amcNames.map((amc, idx) => {
    const dataMap = new Map(
      cumulativeReturns[amc].map((point) => [point.date, point.value])
    );
    
    return {
      label: amc.replace(' Mutual Fund', ''),
      data: sortedDates.map((date) => dataMap.get(date) || null),
      borderColor: CHART_COLORS[idx % CHART_COLORS.length],
      backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] + '20',
      tension: 0.1,
      pointRadius: 0,
      pointHoverRadius: 4,
      fill: false,
    };
  });

  const data = {
    labels: sortedDates,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Cumulative Returns Comparison',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            if (value === null) return null;
            return `${context.dataset.label}: ${(value * 100).toFixed(2)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 12,
        },
      },
      y: {
        ticks: {
          callback: (value) => `${(value * 100).toFixed(0)}%`,
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="h-96">
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default CumulativeReturnChart;
