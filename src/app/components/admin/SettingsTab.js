import { adminButtonPrimary, adminButtonSecondary, adminCard, adminInput } from './shared';

const SettingsTab = () => {
  return (
    <div className={adminCard}>
      <h2 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">Admin Settings</h2>
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-5">
        <div className="md:col-span-3">
          <div className="mb-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-5 shadow-md">
            <h3 className="mb-4 text-xl font-medium text-[var(--text-primary)]">
              Site Configuration
            </h3>
            <form className="space-y-4">
              <div>
                <label
                  htmlFor="site-title"
                  className="mb-1 block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Site Title
                </label>
                <input
                  type="text"
                  id="site-title"
                  defaultValue="RAGESTATE"
                  className={adminInput}
                />
              </div>
              <div>
                <label
                  htmlFor="site-description"
                  className="mb-1 block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Site Description
                </label>
                <textarea
                  id="site-description"
                  rows={3}
                  defaultValue="Official RAGESTATE website"
                  className={adminInput}
                />
              </div>
              <div>
                <label
                  htmlFor="contact-email"
                  className="mb-1 block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Contact Email
                </label>
                <input
                  type="email"
                  id="contact-email"
                  defaultValue="contact@ragestate.com"
                  className={adminInput}
                />
              </div>
              <div className="pt-2">
                <button type="button" className={adminButtonPrimary}>
                  Save Settings
                </button>
              </div>
            </form>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-5 shadow-md">
            <h3 className="mb-4 text-lg font-medium text-[var(--text-primary)]">Admin Users</h3>
            <ul className="space-y-3">
              <li className="flex items-center justify-between border-b border-[var(--border-subtle)] p-2">
                <div className="flex items-center">
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 font-bold text-white">
                    A
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Admin User</p>
                    <p className="text-sm text-[var(--text-tertiary)]">admin@ragestate.com</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-green-500">Super Admin</span>
              </li>
              <li className="flex items-center justify-between border-b border-[var(--border-subtle)] p-2">
                <div className="flex items-center">
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                    M
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Moderator</p>
                    <p className="text-sm text-[var(--text-tertiary)]">mod@ragestate.com</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-blue-500">Moderator</span>
              </li>
            </ul>
            <button className={`mt-4 w-full ${adminButtonSecondary}`}>Manage Admin Users</button>
          </div>
        </div>
        <div className="space-y-6 md:col-span-2">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-5 shadow-md">
            <h3 className="mb-3 text-lg font-medium text-[var(--text-primary)]">System Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Server Status</span>
                <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-500">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Database</span>
                <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-500">
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Last Backup</span>
                <span className="text-sm text-[var(--text-tertiary)]">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Storage Usage</span>
                <span className="text-sm text-[var(--text-tertiary)]">45% (45GB/100GB)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
