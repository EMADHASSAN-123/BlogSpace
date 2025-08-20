export function initChartManager() {
  const chartConfig = {
    type: 'line',
    data: {
      labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو'],
      datasets: [{
        label: 'الزيارات',
        data: [65, 59, 80, 81, 56, 55, 40],
        borderColor: '#6366f1',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      }
    }
  };

  const ctx = document.getElementById('visitsChart').getContext('2d');
  new Chart(ctx, chartConfig);
}