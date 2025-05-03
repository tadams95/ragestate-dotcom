import React from "react";

const SettingsTab = ({ inputStyling, buttonStyling }) => {
  return (
    <div className="bg-gray-900/30 p-6 rounded-lg border border-gray-800 shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-6">Admin Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        <div className="md:col-span-3">
          <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md mb-6">
            <h3 className="text-xl font-medium text-white mb-4">
              Site Configuration
            </h3>
            <form className="space-y-4">
              <div>
                <label
                  htmlFor="site-title"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Site Title
                </label>
                <input
                  type="text"
                  id="site-title"
                  defaultValue="RAGESTATE"
                  className={inputStyling}
                />
              </div>
              <div>
                <label
                  htmlFor="site-description"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Site Description
                </label>
                <textarea
                  id="site-description"
                  rows={3}
                  defaultValue="Official RAGESTATE website"
                  className={inputStyling}
                />
              </div>
              <div>
                <label
                  htmlFor="contact-email"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Contact Email
                </label>
                <input
                  type="email"
                  id="contact-email"
                  defaultValue="contact@ragestate.com"
                  className={inputStyling}
                />
              </div>
              <div className="pt-2">
                <button type="button" className={buttonStyling}>
                  Save Settings
                </button>
              </div>
            </form>
          </div>
          <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
            <h3 className="text-lg font-medium text-gray-100 mb-4">
              Admin Users
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center justify-between p-2 border-b border-gray-700">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold mr-3">
                    A
                  </div>
                  <div>
                    <p className="text-gray-200 font-medium">Admin User</p>
                    <p className="text-gray-400 text-sm">admin@ragestate.com</p>
                  </div>
                </div>
                <span className="text-green-500 text-sm font-medium">
                  Super Admin
                </span>
              </li>
              <li className="flex items-center justify-between p-2 border-b border-gray-700">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mr-3">
                    M
                  </div>
                  <div>
                    <p className="text-gray-200 font-medium">Moderator</p>
                    <p className="text-gray-400 text-sm">mod@ragestate.com</p>
                  </div>
                </div>
                <span className="text-blue-500 text-sm font-medium">
                  Moderator
                </span>
              </li>
            </ul>
            <button className="mt-4 w-full flex justify-center items-center bg-transparent text-gray-300 border border-gray-700 hover:border-gray-500 font-medium py-1.5 px-4 rounded-md text-sm transition-colors">
              Manage Admin Users
            </button>
          </div>
        </div>
        <div className="md:col-span-2 space-y-6">
          <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
            <h3 className="text-lg font-medium text-gray-100 mb-3">
              System Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Server Status</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-500">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Database</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-500">
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Last Backup</span>
                <span className="text-sm text-gray-400">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Storage Usage</span>
                <span className="text-sm text-gray-400">45% (45GB/100GB)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
