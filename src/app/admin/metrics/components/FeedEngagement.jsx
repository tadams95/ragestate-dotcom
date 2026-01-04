'use client';

const StatCard = ({ label, value, subtext, color = 'var(--text-primary)' }) => (
  <div
    className="rounded-lg border p-4"
    style={{
      backgroundColor: 'var(--bg-elev-2)',
      borderColor: 'var(--border-subtle)',
    }}
  >
    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
      {label}
    </p>
    <p className="mt-1 text-2xl font-bold" style={{ color }}>
      {value}
    </p>
    {subtext && (
      <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
        {subtext}
      </p>
    )}
  </div>
);

export default function FeedEngagement({ stats }) {
  if (!stats) return null;

  const {
    totalPosts,
    totalLikes,
    totalComments,
    avgCommentsPerPost,
    avgLikesPerPost,
    postsLast7Days,
    postsLast30Days,
    postsPerDay,
  } = stats;

  return (
    <div
      className="rounded-xl border p-6"
      style={{
        backgroundColor: 'var(--bg-elev-1)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Feed Engagement
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Community activity and engagement metrics
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total Posts" value={totalPosts.toLocaleString()} color="#8b5cf6" />
        <StatCard
          label="Posts/Day"
          value={postsPerDay}
          subtext="Last 30 days average"
          color="#8b5cf6"
        />
        <StatCard
          label="Posts (7d)"
          value={postsLast7Days.toLocaleString()}
          subtext="Last 7 days"
        />
        <StatCard
          label="Posts (30d)"
          value={postsLast30Days.toLocaleString()}
          subtext="Last 30 days"
        />
        <StatCard label="Total Likes" value={totalLikes.toLocaleString()} color="#f43f5e" />
        <StatCard label="Avg Likes/Post" value={avgLikesPerPost} color="#f43f5e" />
        <StatCard label="Total Comments" value={totalComments.toLocaleString()} color="#06b6d4" />
        <StatCard label="Avg Comments/Post" value={avgCommentsPerPost} color="#06b6d4" />
      </div>

      {/* Engagement Summary */}
      <div
        className="mt-6 rounded-lg border p-4"
        style={{
          backgroundColor: 'var(--bg-root)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <h4 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Engagement Summary
        </h4>
        <div className="space-y-2">
          <EngagementBar
            label="Likes per post"
            value={parseFloat(avgLikesPerPost) || 0}
            max={10}
            color="#f43f5e"
          />
          <EngagementBar
            label="Comments per post"
            value={parseFloat(avgCommentsPerPost) || 0}
            max={5}
            color="#06b6d4"
          />
          <EngagementBar
            label="Daily post rate"
            value={parseFloat(postsPerDay) || 0}
            max={10}
            color="#8b5cf6"
          />
        </div>
      </div>
    </div>
  );
}

const EngagementBar = ({ label, value, max, color }) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--text-primary)' }}>{value}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{ backgroundColor: 'var(--bg-elev-2)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};
