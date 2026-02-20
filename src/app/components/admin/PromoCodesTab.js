'use client';

import { PlusIcon, TicketIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  adminButtonOutline,
  adminButtonPrimary,
  adminButtonSecondary,
  adminCard,
  adminInput,
} from './shared/adminStyles';

/**
 * PromoCodesTab - Admin tool for viewing and managing promo codes
 * Lists all codes from both `promoCodes` and legacy `promoterCodes` collections
 */
export default function PromoCodesTab() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive', 'expired'
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    value: '',
    maxUses: '',
    minPurchase: '',
    expiresAt: '',
  });

  const [lastPromoDoc, setLastPromoDoc] = useState(null);
  const [hasMorePromos, setHasMorePromos] = useState(true);

  const db = getFirestore();

  // Fetch promo codes from both collections
  const fetchPromoCodes = useCallback(async () => {
    setLoading(true);
    try {
      const allCodes = [];

      // Fetch from new promoCodes collection (limited)
      const promoRef = collection(db, 'promoCodes');
      const promoQuery = query(promoRef, orderBy('createdAt', 'desc'), limit(50));
      const promoSnap = await getDocs(promoQuery);
      promoSnap.docs.forEach((doc) => {
        allCodes.push({
          id: doc.id,
          collection: 'promoCodes',
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null,
          expiresAt: doc.data().expiresAt?.toDate?.() || null,
          lastUsed: doc.data().lastUsed?.toDate?.() || null,
        });
      });
      setLastPromoDoc(promoSnap.docs[promoSnap.docs.length - 1] || null);
      setHasMorePromos(promoSnap.docs.length === 50);

      // Fetch from legacy promoterCodes collection
      const legacyRef = collection(db, 'promoterCodes');
      const legacyQuery = query(legacyRef, orderBy('createdAt', 'desc'));
      const legacySnap = await getDocs(legacyQuery);
      legacySnap.docs.forEach((doc) => {
        // Avoid duplicates if same code exists in both
        if (!allCodes.find((c) => c.id === doc.id)) {
          allCodes.push({
            id: doc.id,
            collection: 'promoterCodes',
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || null,
            expiresAt: doc.data().expiresAt?.toDate?.() || null,
            lastUsed: doc.data().lastUsed?.toDate?.() || null,
          });
        }
      });

      // Sort by createdAt descending
      allCodes.sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt - a.createdAt;
      });

      setCodes(allCodes);
    } catch (err) {
      console.error('Failed to fetch promo codes:', err);
      toast.error('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    fetchPromoCodes();
  }, [fetchPromoCodes]);

  // Determine code status
  const getCodeStatus = (code) => {
    if (code.active === false) return 'inactive';
    if (code.expiresAt && code.expiresAt < new Date()) return 'expired';
    if (code.maxUses && code.currentUses >= code.maxUses) return 'exhausted';
    return 'active';
  };

  // Filter codes
  const filteredCodes = codes.filter((code) => {
    // Search filter
    const searchMatch =
      !searchTerm ||
      code.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.id.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const status = getCodeStatus(code);
    const statusMatch =
      filterStatus === 'all' ||
      (filterStatus === 'active' && status === 'active') ||
      (filterStatus === 'inactive' &&
        (status === 'inactive' || status === 'expired' || status === 'exhausted'));

    return searchMatch && statusMatch;
  });

  // Stats
  const stats = {
    total: codes.length,
    active: codes.filter((c) => getCodeStatus(c) === 'active').length,
    totalUses: codes.reduce((sum, c) => sum + (c.currentUses || 0), 0),
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const getStatusBadge = (code) => {
    const status = getCodeStatus(code);
    const styles = {
      active: 'bg-green-500/20 text-[var(--success)]',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      expired: 'bg-amber-500/20 text-[var(--warning)]',
      exhausted: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getDiscountDisplay = (code) => {
    if (code.type === 'percentage') {
      return `${code.value}%`;
    } else if (code.type === 'fixed') {
      return `$${(code.value / 100).toFixed(2)}`;
    }
    return code.value || '—';
  };

  // Create a new promo code
  const handleCreateCode = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toast.error('Code is required');
      return;
    }
    if (!formData.value || parseFloat(formData.value) <= 0) {
      toast.error('Valid discount value is required');
      return;
    }

    setCreating(true);
    try {
      const codeLower = formData.code.trim().toLowerCase();
      const codeDoc = doc(db, 'promoCodes', codeLower);

      // Check percentage bounds
      const numValue = parseFloat(formData.value);
      if (formData.type === 'percentage' && (numValue <= 0 || numValue > 100)) {
        toast.error('Percentage must be between 1 and 100');
        setCreating(false);
        return;
      }

      const newCode = {
        code: formData.code.trim().toUpperCase(),
        type: formData.type,
        value: formData.type === 'fixed' ? Math.round(numValue * 100) : numValue, // fixed in cents
        active: true,
        currentUses: 0,
        createdAt: serverTimestamp(),
      };

      if (formData.maxUses) {
        newCode.maxUses = parseInt(formData.maxUses, 10);
      }
      if (formData.minPurchase) {
        newCode.minPurchase = Math.round(parseFloat(formData.minPurchase) * 100); // cents
      }
      if (formData.expiresAt) {
        newCode.expiresAt = new Date(formData.expiresAt);
      }

      await setDoc(codeDoc, newCode);
      toast.success(`Code "${formData.code.toUpperCase()}" created`);
      setShowCreateForm(false);
      setFormData({
        code: '',
        type: 'percentage',
        value: '',
        maxUses: '',
        minPurchase: '',
        expiresAt: '',
      });
      fetchPromoCodes();
    } catch (err) {
      console.error('Failed to create promo code:', err);
      toast.error('Failed to create code');
    } finally {
      setCreating(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (code) => {
    try {
      const codeDoc = doc(db, code.collection, code.id);
      const newActive = !code.active;
      await updateDoc(codeDoc, { active: newActive });
      toast.success(`Code ${newActive ? 'activated' : 'deactivated'}`);
      fetchPromoCodes();
    } catch (err) {
      console.error('Failed to toggle code status:', err);
      toast.error('Failed to update code');
    }
  };

  // Delete a code
  const handleDelete = async (code) => {
    if (!confirm(`Delete code "${code.code || code.id.toUpperCase()}"? This cannot be undone.`)) {
      return;
    }
    try {
      const codeDoc = doc(db, code.collection, code.id);
      await deleteDoc(codeDoc);
      toast.success('Code deleted');
      fetchPromoCodes();
    } catch (err) {
      console.error('Failed to delete code:', err);
      toast.error('Failed to delete code');
    }
  };

  const loadMorePromoCodes = useCallback(async () => {
    if (!lastPromoDoc || !hasMorePromos) return;
    try {
      const q = query(
        collection(db, 'promoCodes'),
        orderBy('createdAt', 'desc'),
        startAfter(lastPromoDoc),
        limit(50),
      );
      const snap = await getDocs(q);
      const newCodes = snap.docs.map((d) => ({
        id: d.id,
        collection: 'promoCodes',
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || null,
        expiresAt: d.data().expiresAt?.toDate?.() || null,
        lastUsed: d.data().lastUsed?.toDate?.() || null,
      }));
      setCodes((prev) => [...prev, ...newCodes]);
      setLastPromoDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMorePromos(snap.docs.length === 50);
    } catch (err) {
      console.error('Failed to load more promo codes:', err);
      toast.error('Failed to load more codes');
    }
  }, [db, lastPromoDoc, hasMorePromos]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className={adminCard}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Promo Codes</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Manage discount codes for checkout
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className={adminButtonPrimary}
            >
              <PlusIcon className="mr-1.5 h-4 w-4" />
              Create Code
            </button>
            <TicketIcon className="h-8 w-8 text-[var(--text-tertiary)]" />
          </div>
        </div>

        {/* Stats row */}
        <div className="wave-in-stagger mt-4 grid grid-cols-3 gap-4">
          <div className="animate-wave-in rounded-lg bg-[var(--bg-elev-2)] p-3">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
            <p className="text-xs text-[var(--text-secondary)]">Total Codes</p>
          </div>
          <div className="animate-wave-in rounded-lg bg-[var(--bg-elev-2)] p-3">
            <p className="text-2xl font-bold text-[var(--success)]">{stats.active}</p>
            <p className="text-xs text-[var(--text-secondary)]">Active</p>
          </div>
          <div className="animate-wave-in rounded-lg bg-[var(--bg-elev-2)] p-3">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalUses}</p>
            <p className="text-xs text-[var(--text-secondary)]">Total Uses</p>
          </div>
        </div>
      </div>

      {/* Create Code Form */}
      {showCreateForm && (
        <div className={adminCard}>
          <h3 className="mb-4 text-lg font-medium text-[var(--text-primary)]">Create New Code</h3>
          <form onSubmit={handleCreateCode} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Code */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                  Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER20"
                  className={adminInput}
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                  Discount Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className={adminInput}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>

              {/* Value */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                  {formData.type === 'percentage' ? 'Percentage *' : 'Amount ($) *'}
                </label>
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.type === 'percentage' ? '20' : '10.00'}
                  min="0"
                  max={formData.type === 'percentage' ? '100' : undefined}
                  step={formData.type === 'percentage' ? '1' : '0.01'}
                  className={adminInput}
                  required
                />
              </div>

              {/* Max Uses */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                  Max Uses (optional)
                </label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  placeholder="Unlimited"
                  min="1"
                  className={adminInput}
                />
              </div>

              {/* Min Purchase */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                  Min Purchase $ (optional)
                </label>
                <input
                  type="number"
                  value={formData.minPurchase}
                  onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                  placeholder="No minimum"
                  min="0"
                  step="0.01"
                  className={adminInput}
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                  Expires (optional)
                </label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className={adminInput}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({
                    code: '',
                    type: 'percentage',
                    value: '',
                    maxUses: '',
                    minPurchase: '',
                    expiresAt: '',
                  });
                }}
                className={adminButtonSecondary}
              >
                Cancel
              </button>
              <button type="submit" disabled={creating} className={adminButtonPrimary}>
                {creating ? 'Creating...' : 'Create Code'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${adminInput} max-w-xs`}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={adminInput}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive/Expired</option>
          </select>
        </div>
        <button
          onClick={fetchPromoCodes}
          className={adminButtonOutline}
        >
          Refresh
        </button>
      </div>

      {/* Codes table */}
      <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border-subtle)]">
            <thead className="bg-[var(--bg-elev-2)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Discount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Usage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Min Purchase
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Expires
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Last Used
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                    {codes.length === 0
                      ? 'No promo codes found. Create one to get started.'
                      : 'No codes match your filters.'}
                  </td>
                </tr>
              ) : (
                filteredCodes.map((code) => (
                  <tr
                    key={`${code.collection}-${code.id}`}
                    className="border-l-2 border-l-transparent transition-colors hover:border-l-[var(--accent)] hover:bg-[var(--bg-elev-2)]"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <div>
                        <p className="font-mono font-semibold text-[var(--text-primary)]">
                          {code.code || code.id.toUpperCase()}
                        </p>
                        {code.collection === 'promoterCodes' && (
                          <p className="text-xs text-[var(--text-tertiary)]">Legacy</p>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-medium text-[var(--text-primary)]">
                        {getDiscountDisplay(code)}
                      </span>
                      <span className="ml-1 text-xs text-[var(--text-secondary)]">
                        {code.type === 'percentage' ? 'off' : 'off'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{getStatusBadge(code)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-primary)]">
                      <span className="font-medium">{code.currentUses || 0}</span>
                      {code.maxUses && (
                        <span className="text-[var(--text-secondary)]"> / {code.maxUses}</span>
                      )}
                      {!code.maxUses && <span className="text-[var(--text-tertiary)]"> / ∞</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {code.minPurchase ? `$${(code.minPurchase / 100).toFixed(2)}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {formatDate(code.expiresAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {formatDate(code.lastUsed)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(code)}
                          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                            code.active !== false
                              ? 'bg-amber-500/20 text-[var(--warning)] hover:bg-amber-500/30'
                              : 'bg-green-500/20 text-[var(--success)] hover:bg-green-500/30'
                          }`}
                          title={code.active !== false ? 'Deactivate' : 'Activate'}
                        >
                          {code.active !== false ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(code)}
                          className="rounded p-1 text-red-500 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Load More */}
      {hasMorePromos && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMorePromoCodes}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elev-1)]"
          >
            Load More Codes
          </button>
        </div>
      )}

      {/* Info note */}
      <p className="text-center text-xs text-[var(--text-tertiary)]">
        Showing {filteredCodes.length} of {codes.length} codes
      </p>
    </div>
  );
}
