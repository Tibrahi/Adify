// Mock data for recent ads
const recentAds = [
    { title: 'Summer Sale 2025', status: 'active', impressions: '12.4k' },
    { title: 'New Product Launch', status: 'pending', impressions: '0' },
    { title: 'Brand Awareness', status: 'active', impressions: '8.2k' },
    { title: 'Holiday Special', status: 'inactive', impressions: '3.1k' },
    { title: 'Flash Discount', status: 'active', impressions: '21.5k' },
];

// Populate recent ads table
function loadRecentAds() {
    const tbody = document.getElementById('recentAdsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    recentAds.forEach(ad => {
        const row = document.createElement('tr');

        // Title cell
        const titleCell = document.createElement('td');
        titleCell.textContent = ad.title;
        row.appendChild(titleCell);

        // Status cell with badge
        const statusCell = document.createElement('td');
        const badge = document.createElement('span');
        badge.classList.add('status-badge', `status-${ad.status}`);
        badge.textContent = ad.status;
        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        // Impressions cell
        const imprCell = document.createElement('td');
        imprCell.textContent = ad.impressions;
        row.appendChild(imprCell);

        tbody.appendChild(row);
    });
}

// Initialize Chart.js chart
function initChart() {
    const ctx = document.getElementById('viewsChart')?.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Ad Views',
                data: [4200, 5800, 6100, 7200, 8100, 9400, 10200],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#1e293b' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#e2e8f0' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// Optional: Update stats numbers dynamically (could be fetched from API)
function updateStats() {
    // For demo, numbers are already in HTML. You could set them here.
    // document.getElementById('totalAds').textContent = '1,254';
    // etc.
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    loadRecentAds();
    initChart();
    updateStats();

    // Optional: Simulate search functionality
    const searchInput = document.querySelector('.header-search input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#recentAdsTableBody tr');
            rows.forEach(row => {
                const title = row.cells[0].textContent.toLowerCase();
                row.style.display = title.includes(term) ? '' : 'none';
            });
        });
    }
});