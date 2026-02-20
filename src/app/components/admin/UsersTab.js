'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  getAdminProfiles,
  getAdminUserView,
  getProfileCount,
  searchAdminProfiles,
} from '../../../../lib/firebase/adminService';
import { adminButtonOutline, adminInput } from './shared/adminStyles';
import { AdminErrorState, UsersTabSkeleton } from './shared';
import UserDetailModal from './UserDetailModal';

const PAGE_SIZE = 20;

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCache, setPageCache] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const searchTimer = useRef(null);

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  // Enrich profiles with RTDB data (email, isAdmin, disabled)
  const enrichProfiles = useCallback(async (profiles) => {
    const uids = profiles.map((p) => p.id);
    const results = await Promise.allSettled(uids.map((uid) => getAdminUserView(uid)));
    return profiles.map((profile, i) => {
      const rtdb = results[i].status === 'fulfilled' ? results[i].value : null;
      return {
        ...profile,
        email: rtdb?.email || null,
        phoneNumber: rtdb?.phoneNumber || null,
        isAdmin: rtdb?.isAdmin === true || rtdb?.role === 'admin',
        disabled: rtdb?.disabled === true,
      };
    });
  }, []);

  // Load initial data
  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      setLoading(true);
      setError(null);
      try {
        const [countResult, profilesResult] = await Promise.allSettled([
          getProfileCount(),
          getAdminProfiles(null, PAGE_SIZE),
        ]);

        if (cancelled) return;

        if (countResult.status === 'fulfilled') {
          setTotalCount(countResult.value);
        }

        if (profilesResult.status === 'fulfilled') {
          const { profiles, lastDoc } = profilesResult.value;
          const enriched = await enrichProfiles(profiles);
          if (cancelled) return;
          setUsers(enriched);
          setPageCache({ 1: { profiles: enriched, lastDoc } });
          setCurrentPage(1);
        } else {
          throw profilesResult.reason || new Error('Failed to load profiles');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading users:', err);
          setError(err.message || 'Failed to load users');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitial();
    return () => { cancelled = true; };
  }, [enrichProfiles]);

  // Handle search
  useEffect(() => {
    if (!debouncedSearch) return;
    let cancelled = false;

    async function doSearch() {
      setLoading(true);
      setError(null);
      try {
        const { profiles } = await searchAdminProfiles(debouncedSearch, PAGE_SIZE);
        if (cancelled) return;
        const enriched = await enrichProfiles(profiles);
        if (cancelled) return;
        setUsers(enriched);
        setCurrentPage(1);
        setPageCache({});
      } catch (err) {
        if (!cancelled) {
          console.error('Search error:', err);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    doSearch();
    return () => { cancelled = true; };
  }, [debouncedSearch, enrichProfiles]);

  // Reset to paginated view when search cleared
  useEffect(() => {
    if (debouncedSearch === '' && Object.keys(pageCache).length > 0 && pageCache[1]) {
      setUsers(pageCache[1].profiles);
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleNextPage = useCallback(async () => {
    const nextPage = currentPage + 1;
    // Check cache first
    if (pageCache[nextPage]) {
      setUsers(pageCache[nextPage].profiles);
      setCurrentPage(nextPage);
      return;
    }

    const currentCached = pageCache[currentPage];
    if (!currentCached?.lastDoc) return;

    setLoading(true);
    try {
      const { profiles, lastDoc } = await getAdminProfiles(currentCached.lastDoc, PAGE_SIZE);
      const enriched = await enrichProfiles(profiles);
      setPageCache((prev) => ({ ...prev, [nextPage]: { profiles: enriched, lastDoc } }));
      setUsers(enriched);
      setCurrentPage(nextPage);
    } catch (err) {
      console.error('Error loading next page:', err);
      toast.error('Failed to load next page');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageCache, enrichProfiles]);

  const handlePrevPage = useCallback(() => {
    const prevPage = currentPage - 1;
    if (prevPage < 1 || !pageCache[prevPage]) return;
    setUsers(pageCache[prevPage].profiles);
    setCurrentPage(prevPage);
  }, [currentPage, pageCache]);

  // Filter by status (client-side on current page)
  const displayedUsers = useMemo(() => {
    if (statusFilter === 'all') return users || [];
    return (users || []).filter((u) => {
      if (statusFilter === 'admin') return u.isAdmin;
      if (statusFilter === 'disabled') return u.disabled;
      if (statusFilter === 'active') return !u.isAdmin && !u.disabled;
      return true;
    });
  }, [users, statusFilter]);

  const handleUserUpdated = useCallback(
    (userId, disabled) => {
      // Update current users array
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, disabled } : u)),
      );
      // Update page cache for current page
      setPageCache((prev) => {
        const cached = prev[currentPage];
        if (!cached) return prev;
        return {
          ...prev,
          [currentPage]: {
            ...cached,
            profiles: cached.profiles.map((u) =>
              u.id === userId ? { ...u, disabled } : u,
            ),
          },
        };
      });
    },
    [currentPage],
  );

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const isSearching = debouncedSearch.length > 0;
  const hasNextPage = !isSearching && currentPage < totalPages && pageCache[currentPage]?.lastDoc;
  const hasPrevPage = !isSearching && currentPage > 1;

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">User Management</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${adminInput} sm:w-64`}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${adminInput} sm:w-32`}
          >
            <option value="all">All Users</option>
            <option value="active">Active</option>
            <option value="admin">Admin</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <UsersTabSkeleton />
      ) : error ? (
        <AdminErrorState
          title="Error loading users"
          message={error}
          onRetry={() => window.location.reload()}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] shadow-md">
          {displayedUsers.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-tertiary)]">
              {searchQuery || statusFilter !== 'all'
                ? 'No users match your search criteria.'
                : 'No users found.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-subtle)]">
                  <thead>
                    <tr className="bg-[var(--bg-elev-2)]">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        Display Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {displayedUsers.map((user) => (
                      <tr key={user.id} className="border-l-2 border-l-transparent transition-colors hover:border-l-[var(--accent)] hover:bg-[var(--bg-elev-1)]">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-3">
                            {user.photoURL || user.profilePicture ? (
                              <img
                                src={user.photoURL || user.profilePicture}
                                alt=""
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                                {(user.displayName?.[0] || '?').toUpperCase()}
                              </div>
                            )}
                            <div>
                              {user.username && (
                                <p className="text-sm text-[var(--text-secondary)]">@{user.username}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-primary)]">
                          {user.displayName || 'Unknown'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {user.email || 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${
                              user.isAdmin
                                ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                                : user.disabled
                                  ? 'bg-red-500/20 text-[var(--danger)]'
                                  : 'bg-green-500/20 text-[var(--success)]'
                            }`}
                          >
                            {user.isAdmin ? 'Admin' : user.disabled ? 'Disabled' : 'Active'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <button
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setModalOpen(true);
                            }}
                            className="text-red-500 hover:text-red-400"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-6 py-3">
                <div className="text-sm text-[var(--text-tertiary)]">
                  {isSearching ? (
                    <span><span className="font-medium">{displayedUsers.length}</span> results</span>
                  ) : (
                    <>
                      Showing{' '}
                      <span className="font-medium">
                        {displayedUsers.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {(currentPage - 1) * PAGE_SIZE + displayedUsers.length}
                      </span>{' '}
                      of <span className="font-medium">{totalCount}</span> users
                    </>
                  )}
                  {statusFilter !== 'all' && (
                    <span className="text-[var(--text-tertiary)]"> (filter applies to current page)</span>
                  )}
                </div>
                {!isSearching && (
                  <div className="flex space-x-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={!hasPrevPage}
                      className={`${adminButtonOutline} ${!hasPrevPage ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={!hasNextPage}
                      className={`${adminButtonOutline} ${!hasNextPage ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <UserDetailModal
        userId={selectedUserId}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedUserId(null);
        }}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
}
