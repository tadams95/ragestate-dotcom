/**
 * CSV Export Utilities for Metrics Dashboard
 * Generates acquirer-ready data exports
 */

/**
 * Convert metrics data to CSV format and trigger download
 * @param {Object} params - Export parameters
 * @param {Array} params.revenueData - Daily revenue data
 * @param {number} params.totalRevenue - All-time revenue in cents
 * @param {Array} params.userGrowthData - Daily user signup data
 * @param {number} params.totalUsers - Total users
 * @param {Object} params.feedStats - Feed engagement stats
 * @param {Array} params.events - Event scanning metrics
 */
export function exportMetricsCsv({
  revenueData = [],
  totalRevenue = 0,
  userGrowthData = [],
  totalUsers = 0,
  feedStats = {},
  events = [],
}) {
  const timestamp = new Date().toISOString().split('T')[0];
  const sections = [];

  // Section 1: Summary Metrics
  sections.push('# RAGESTATE Metrics Export');
  sections.push(`# Generated: ${new Date().toISOString()}`);
  sections.push('');
  sections.push('## Summary');
  sections.push('Metric,Value');
  sections.push(`Total Revenue,$${(totalRevenue / 100).toFixed(2)}`);
  sections.push(`Total Users,${totalUsers}`);
  sections.push(`Total Posts,${feedStats.totalPosts || 0}`);
  sections.push(`Total Likes,${feedStats.totalLikes || 0}`);
  sections.push(`Total Comments,${feedStats.totalComments || 0}`);
  sections.push(`Avg Comments/Post,${(feedStats.avgCommentsPerPost || 0).toFixed(2)}`);
  sections.push(`Posts (Last 7 Days),${feedStats.postsLast7Days || 0}`);
  sections.push(`Posts (Last 30 Days),${feedStats.postsLast30Days || 0}`);
  sections.push('');

  // Section 2: Daily Revenue
  if (revenueData.length > 0) {
    sections.push('## Daily Revenue');
    sections.push('Date,Revenue ($),Orders');
    revenueData.forEach((day) => {
      sections.push(`${day.date},$${(day.revenue / 100).toFixed(2)},${day.orders || 0}`);
    });
    sections.push('');
  }

  // Section 3: User Growth
  if (userGrowthData.length > 0) {
    sections.push('## User Growth');
    sections.push('Date,New Signups,Cumulative Users');
    userGrowthData.forEach((day) => {
      sections.push(`${day.date},${day.signups || 0},${day.cumulative || 0}`);
    });
    sections.push('');
  }

  // Section 4: Event Scanning Metrics
  if (events.length > 0) {
    sections.push('## Event Scanning Metrics');
    sections.push('Event ID,Scans Accepted,Scan Denials,Avg Remaining,Last Updated');
    events.forEach((event) => {
      sections.push(
        `${event.id},${event.scansAccepted},${event.scanDenials},${event.avgRemaining},"${event.lastUpdated || ''}"`,
      );
    });
    sections.push('');
  }

  // Convert to CSV and download
  const csvContent = sections.join('\n');
  downloadCsv(csvContent, `ragestate-metrics-${timestamp}.csv`);
}

/**
 * Export only revenue data with date range filter
 * @param {Array} revenueData - Revenue data array
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 */
export function exportRevenueCsv(revenueData, startDate, endDate) {
  const filtered = revenueData.filter((day) => {
    if (startDate && day.date < startDate) return false;
    if (endDate && day.date > endDate) return false;
    return true;
  });

  const total = filtered.reduce((sum, day) => sum + (day.revenue || 0), 0);
  const orders = filtered.reduce((sum, day) => sum + (day.orders || 0), 0);

  const lines = [
    '# RAGESTATE Revenue Export',
    `# Period: ${startDate || 'All'} to ${endDate || 'All'}`,
    `# Total Revenue: $${(total / 100).toFixed(2)}`,
    `# Total Orders: ${orders}`,
    '',
    'Date,Revenue ($),Orders',
  ];

  filtered.forEach((day) => {
    lines.push(`${day.date},$${(day.revenue / 100).toFixed(2)},${day.orders || 0}`);
  });

  const timestamp = new Date().toISOString().split('T')[0];
  downloadCsv(lines.join('\n'), `ragestate-revenue-${timestamp}.csv`);
}

/**
 * Export user growth data
 * @param {Array} userGrowthData - User growth data array
 */
export function exportUserGrowthCsv(userGrowthData) {
  const lines = [
    '# RAGESTATE User Growth Export',
    `# Generated: ${new Date().toISOString()}`,
    '',
    'Date,New Signups,Cumulative Users',
  ];

  userGrowthData.forEach((day) => {
    lines.push(`${day.date},${day.signups || 0},${day.cumulative || 0}`);
  });

  const timestamp = new Date().toISOString().split('T')[0];
  downloadCsv(lines.join('\n'), `ragestate-users-${timestamp}.csv`);
}

/**
 * Trigger CSV file download
 * @param {string} content - CSV content
 * @param {string} filename - Download filename
 */
function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
