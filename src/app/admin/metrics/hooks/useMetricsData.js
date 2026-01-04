'use client';

import { collection, getDocs, getFirestore, limit, orderBy, query } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { app } from '../../../../../firebase/firebase';

/**
 * Hook for fetching and aggregating metrics data
 * Returns revenue data, user growth data, and feed engagement data
 */
export function useMetricsData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Revenue data
  const [revenueData, setRevenueData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  // User data
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);

  // Feed engagement data
  const [feedStats, setFeedStats] = useState({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    avgCommentsPerPost: 0,
    postsLast7Days: 0,
    postsLast30Days: 0,
  });

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const db = getFirestore(app);

      // Fetch all data in parallel
      const [purchasesData, usersData, postsData] = await Promise.all([
        fetchPurchases(db),
        fetchUsers(db),
        fetchPosts(db),
      ]);

      // Process revenue data
      const { dailyRevenue, total } = aggregateRevenue(purchasesData);
      setRevenueData(dailyRevenue);
      setTotalRevenue(total);

      // Process user growth data
      const { dailySignups, total: userTotal } = aggregateUserGrowth(usersData);
      setUserGrowthData(dailySignups);
      setTotalUsers(userTotal);

      // Process feed engagement
      const feedEngagement = calculateFeedEngagement(postsData);
      setFeedStats(feedEngagement);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError(err.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    loading,
    error,
    revenueData,
    totalRevenue,
    userGrowthData,
    totalUsers,
    feedStats,
    refetch: fetchMetrics,
  };
}

/**
 * Fetch purchases from Firestore
 */
async function fetchPurchases(db) {
  try {
    const purchasesQuery = query(
      collection(db, 'purchases'),
      orderBy('orderDate', 'desc'),
      limit(500), // Last 500 purchases for metrics
    );
    const snapshot = await getDocs(purchasesQuery);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      // totalAmount is stored as a string like "15.00" (dollars), parse to cents
      const amountStr = data.totalAmount || '0';
      const amountDollars = parseFloat(amountStr) || 0;
      const amountCents = Math.round(amountDollars * 100);
      return {
        id: doc.id,
        totalAmount: amountCents,
        orderDate: data.orderDate?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
        status: data.status,
      };
    });
  } catch (err) {
    console.warn('Error fetching purchases:', err);
    return [];
  }
}

/**
 * Fetch users from Firestore
 */
async function fetchUsers(db) {
  try {
    const usersQuery = query(
      collection(db, 'customers'),
      orderBy('createdAt', 'desc'),
      limit(1000),
    );
    const snapshot = await getDocs(usersQuery);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || null,
      };
    });
  } catch (err) {
    console.warn('Error fetching users:', err);
    return [];
  }
}

/**
 * Fetch posts from Firestore
 */
async function fetchPosts(db) {
  try {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(500));
    const snapshot = await getDocs(postsQuery);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        likeCount: data.likeCount || 0,
        commentCount: data.commentCount || 0,
      };
    });
  } catch (err) {
    console.warn('Error fetching posts:', err);
    return [];
  }
}

/**
 * Aggregate revenue by day for the last 30 days
 */
function aggregateRevenue(purchases) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Create a map for each day
  const dailyMap = new Map();

  // Initialize all days with 0
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = formatDateKey(date);
    dailyMap.set(key, { date: key, revenue: 0, orders: 0 });
  }

  // Aggregate purchases
  let total = 0;
  purchases.forEach((purchase) => {
    if (purchase.orderDate >= thirtyDaysAgo) {
      const key = formatDateKey(purchase.orderDate);
      if (dailyMap.has(key)) {
        const day = dailyMap.get(key);
        day.revenue += purchase.totalAmount || 0;
        day.orders += 1;
      }
    }
    total += purchase.totalAmount || 0;
  });

  return {
    dailyRevenue: Array.from(dailyMap.values()),
    total,
  };
}

/**
 * Aggregate user signups by day for the last 30 days
 */
function aggregateUserGrowth(users) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Create a map for each day
  const dailyMap = new Map();

  // Initialize all days with 0
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = formatDateKey(date);
    dailyMap.set(key, { date: key, signups: 0, cumulative: 0 });
  }

  // Count users with valid createdAt within range
  let usersWithDate = 0;
  users.forEach((user) => {
    if (user.createdAt && user.createdAt >= thirtyDaysAgo) {
      const key = formatDateKey(user.createdAt);
      if (dailyMap.has(key)) {
        dailyMap.get(key).signups += 1;
      }
      usersWithDate++;
    }
  });

  // Calculate cumulative totals
  const result = Array.from(dailyMap.values());
  let cumulative = users.length - usersWithDate; // Start with users before the 30-day window
  result.forEach((day) => {
    cumulative += day.signups;
    day.cumulative = cumulative;
  });

  return {
    dailySignups: result,
    total: users.length,
  };
}

/**
 * Calculate feed engagement metrics
 */
function calculateFeedEngagement(posts) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let totalLikes = 0;
  let totalComments = 0;
  let postsLast7Days = 0;
  let postsLast30Days = 0;

  posts.forEach((post) => {
    totalLikes += post.likeCount || 0;
    totalComments += post.commentCount || 0;

    if (post.createdAt >= sevenDaysAgo) {
      postsLast7Days++;
    }
    if (post.createdAt >= thirtyDaysAgo) {
      postsLast30Days++;
    }
  });

  return {
    totalPosts: posts.length,
    totalLikes,
    totalComments,
    avgCommentsPerPost: posts.length > 0 ? (totalComments / posts.length).toFixed(1) : 0,
    avgLikesPerPost: posts.length > 0 ? (totalLikes / posts.length).toFixed(1) : 0,
    postsLast7Days,
    postsLast30Days,
    postsPerDay: postsLast30Days > 0 ? (postsLast30Days / 30).toFixed(1) : 0,
  };
}

/**
 * Format date as YYYY-MM-DD for grouping
 */
function formatDateKey(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Aggregate data by week
 */
export function aggregateByWeek(dailyData, valueKey) {
  const weeks = [];
  for (let i = 0; i < dailyData.length; i += 7) {
    const weekData = dailyData.slice(i, i + 7);
    const total = weekData.reduce((sum, day) => sum + (day[valueKey] || 0), 0);
    weeks.push({
      date: weekData[0]?.date || '',
      [valueKey]: total,
      label: `Week of ${weekData[0]?.date || ''}`,
    });
  }
  return weeks;
}

/**
 * Aggregate data by month (simplified - last 30 days as one month)
 */
export function aggregateByMonth(dailyData, valueKey) {
  const total = dailyData.reduce((sum, day) => sum + (day[valueKey] || 0), 0);
  return [
    {
      date: 'Last 30 Days',
      [valueKey]: total,
    },
  ];
}
