'use client';

import { useMemo, useState } from 'react';
import { AdminErrorState, UsersTabSkeleton } from './shared';

const UsersTab = ({
  loading,
  error,
  users,
  userCount,
  currentUserPage,
  usersPerPage,
  handleUserPageChange,
  inputStyling,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter users based on search query and status
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      const query = searchQuery.toLowerCase();
      const fullName =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.displayName || '';
      const matchesSearch =
        !query ||
        fullName.toLowerCase().includes(query) ||
        (user.email || '').toLowerCase().includes(query) ||
        (user.id || '').toLowerCase().includes(query) ||
        (user.phoneNumber || '').includes(query);

      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'admin' && user.isAdmin) ||
        (statusFilter === 'disabled' && user.disabled) ||
        (statusFilter === 'active' && !user.isAdmin && !user.disabled);

      return matchesSearch && matchesStatus;
    });
  }, [users, searchQuery, statusFilter]);

  // Paginate filtered users
  const paginatedUsers = useMemo(() => {
    const start = (currentUserPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, currentUserPage, usersPerPage]);

  const totalFilteredPages = Math.ceil(filteredUsers.length / usersPerPage);

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">User Management</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={inputStyling + ' sm:w-64'}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={inputStyling + ' sm:w-32'}
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
      ) : error.users ? (
        <AdminErrorState
          title="Error loading users"
          message={error.users}
          onRetry={() => window.location.reload()}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] shadow-md">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-tertiary)]">
              {searchQuery || statusFilter !== 'all'
                ? 'No users match your search criteria.'
                : 'No users found. Start by creating user accounts.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-subtle)]">
                  <thead>
                    <tr className="bg-[var(--bg-elev-2)]">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        User ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        Phone Number
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
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className="transition-colors hover:bg-[var(--bg-elev-1)]">
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-[var(--text-secondary)]">
                          {user.id.substring(0, 12)}...
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.displayName || 'Unknown Name'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {user.email || 'No Email'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {user.phoneNumber || 'No Phone'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${
                              user.isAdmin
                                ? 'bg-purple-500/20 text-purple-500'
                                : user.disabled
                                  ? 'bg-red-500/20 text-red-500'
                                  : 'bg-green-500/20 text-green-500'
                            }`}
                          >
                            {user.isAdmin ? 'Admin' : user.disabled ? 'Disabled' : 'Active'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <button
                            onClick={() => alert(`View user ${user.id}`)}
                            className="mr-3 text-red-500 hover:text-red-400"
                          >
                            View
                          </button>
                          <button
                            onClick={() => alert(`Edit user ${user.id}`)}
                            className="text-blue-500 hover:text-blue-400"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-6 py-3">
                <div className="text-sm text-[var(--text-tertiary)]">
                  Showing{' '}
                  <span className="font-medium">
                    {filteredUsers.length > 0 ? (currentUserPage - 1) * usersPerPage + 1 : 0}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentUserPage * usersPerPage, filteredUsers.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredUsers.length}</span> users
                  {(searchQuery || statusFilter !== 'all') && ` (filtered from ${userCount})`}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleUserPageChange('prev')}
                    disabled={currentUserPage === 1}
                    className={`rounded-md border border-[var(--border-subtle)] px-3 py-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)] ${
                      currentUserPage === 1 ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleUserPageChange('next')}
                    disabled={currentUserPage >= totalFilteredPages}
                    className={`rounded-md border border-[var(--border-subtle)] px-3 py-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)] ${
                      currentUserPage >= totalFilteredPages ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default UsersTab;
