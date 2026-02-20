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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ExpenseDragChart = ({ expenseDragData }) => {
  if (!expenseDragData || !expenseDragData.time_series || expenseDragData.time_series.length === 0) {
    return null;
  }

  const timeSeries = expenseDragData.time_series;
  const dates = timeSeries.map((point) => point.date);
  const directNavs = timeSeries.map((point) => point.direct_nav);
  const regularNavs = timeSeries.map((point) => point.regular_nav);
  const expenseDrags = timeSeries.map((point) => point.expense_drag_percent);

  const data = {
    labels: dates,
    datasets: [
      {
        label: 'Direct NAV',
        data: directNavs,
        borderColor: '#2563eb',
        backgroundColor: '#2563eb20',
        yAxisID: 'y',
        tension: 0.1,
        pointRadius: 0,
      },
      {
        label: 'Regular NAV',
        data: regularNavs,
        borderColor: '#dc2626',
        backgroundColor: '#dc262620',
        yAxisID: 'y',
        tension: 0.1,
        pointRadius: 0,
      },
      {
        label: 'Expense Drag (%)',
        data: expenseDrags,
        borderColor: '#16a34a',
        backgroundColor: '#16a34a20',
        yAxisID: 'y1',
        tension: 0.1,
        pointRadius: 0,
        borderDash: [5, 5],
      },
    ],
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
        text: `Direct vs Regular NAV - ${expenseDragData.amc_name}`,
      },
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 12,
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'NAV (₹)',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Expense Drag (%)',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="h-96">
        <Line data={data} options={options} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">Avg Expense Drag</p>
          <p className="text-xl font-semibold text-green-600">
            {expenseDragData.average_expense_drag?.toFixed(2) || 'N/A'}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Total Expense Drag</p>
          <p className="text-xl font-semibold text-red-600">
            ₹{expenseDragData.total_expense_drag?.toFixed(2) || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDragChart;
