import React from "react";

const UsersTab = ({
  loading,
  error,
  users,
  userCount,
  currentUserPage,
  usersPerPage,
  handleUserPageChange,
  inputStyling,
  buttonStyling,
  loadingState,
  errorState,
}) => {
  return (
    <div className="bg-gray-900/30 p-6 rounded-lg border border-gray-800 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">User Management</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search users..."
            className={inputStyling}
          />
          <button className={buttonStyling}>Search</button>
        </div>
      </div>

      {loading ? (
        loadingState
      ) : error.users ? (
        <div className="bg-red-500/20 border border-red-500 p-4 rounded-md text-white">
          <h3 className="text-lg font-medium">Error loading users</h3>
          <p>{error.users}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 shadow-md overflow-hidden">
          {users.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No users found. Start by creating user accounts.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr className="bg-gray-800/50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        User ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Phone Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {users
                      .slice(
                        (currentUserPage - 1) * usersPerPage,
                        currentUserPage * usersPerPage
                      )
                      .map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">
                            {user.id.substring(0, 12)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.displayName || "Unknown Name"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {user.email || "No Email"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {user.phoneNumber || "No Phone"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.isAdmin
                                  ? "bg-purple-500/20 text-purple-500"
                                  : user.disabled
                                  ? "bg-red-500/20 text-red-500"
                                  : "bg-green-500/20 text-green-500"
                              }`}
                            >
                              {user.isAdmin
                                ? "Admin"
                                : user.disabled
                                ? "Disabled"
                                : "Active"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => alert(`View user ${user.id}`)}
                              className="text-red-500 hover:text-red-400 mr-3"
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
              <div className="px-6 py-3 flex items-center justify-between border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  Showing{" "}
                  <span className="font-medium">
                    {(currentUserPage - 1) * usersPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(currentUserPage * usersPerPage, userCount)}
                  </span>{" "}
                  of <span className="font-medium">{userCount}</span> users
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleUserPageChange("prev")}
                    disabled={currentUserPage === 1}
                    className={`px-3 py-1 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 ${
                      currentUserPage === 1
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleUserPageChange("next")}
                    disabled={currentUserPage * usersPerPage >= userCount}
                    className={`px-3 py-1 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700 ${
                      currentUserPage * usersPerPage >= userCount
                        ? "opacity-50 cursor-not-allowed"
                        : ""
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
