"use client";

export default function SettingsTab({
  inputStyling,
  buttonStyling,
  cardStyling,
  containerStyling,
  onLogout, // Pass the logout handler from the parent
}) {
  // Add state and handlers for password change if needed
  // const [currentPassword, setCurrentPassword] = useState('');
  // const [newPassword, setNewPassword] = useState('');
  // const [confirmPassword, setConfirmPassword] = useState('');

  // const handlePasswordUpdate = (e) => {
  //   e.preventDefault();
  //   // Add password update logic here
  //   console.log("Update password clicked");
  // };

  const handleDeleteAccount = () => {
    // Add account deletion logic here
    // This should likely involve confirmation prompts
    alert("Account deletion feature not yet implemented.");
    console.log("Delete account clicked");
  };

  return (
    <div className={containerStyling}>
      <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        {/* Password Change Form */}
        <div className="md:col-span-3">
          <div className={`${cardStyling} mb-6`}>
            <h3 className="text-xl font-medium text-white mb-4">
              Change Password
            </h3>
            {/* <form className="space-y-4" onSubmit={handlePasswordUpdate}> */}
            <form className="space-y-4">
              {" "}
              {/* Temporarily disable submit */}
              <div>
                <label
                  htmlFor="current-password"
                  className="block text-sm font-medium text-gray-300"
                >
                  Current Password
                </label>
                <input
                  type="password"
                  id="current-password"
                  className={inputStyling}
                  // value={currentPassword}
                  // onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-gray-300"
                >
                  New Password
                </label>
                <input
                  type="password"
                  id="new-password"
                  className={inputStyling}
                  // value={newPassword}
                  // onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-gray-300"
                >
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  className={inputStyling}
                  // value={confirmPassword}
                  // onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  className={buttonStyling}
                  onClick={() => alert("Password update not implemented yet.")}
                >
                  {" "}
                  {/* Temporarily disable */}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Account Management and Details */}
        <div className="md:col-span-2 space-y-6">
          <div className={cardStyling}>
            <h3 className="text-lg font-medium text-gray-100 mb-4">
              Account Management
            </h3>
            <div className="space-y-4">
              <button
                onClick={onLogout} // Use the passed handler
                className="w-full flex justify-center items-center bg-red-700 hover:bg-red-800 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Sign Out
              </button>

              <button
                onClick={handleDeleteAccount}
                className="w-full flex justify-center items-center text-red-500 border border-red-500 hover:bg-red-500/10 font-medium py-2 px-4 rounded-md transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
