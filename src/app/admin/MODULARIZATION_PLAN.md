# filepath: /Users/tyrelle/Desktop/RAGESTATE-DOTCOM/ragestate-dotcom/src/app/admin/MODULARIZATION_PLAN.md

# Admin Page Modularization Plan

This document outlines the steps to refactor the `AdminPage` component (`src/app/admin/page.js`) into smaller, more manageable modules.

**Status: Completed**

## Step-by-Step Plan:

1.  **Create Admin Components Directory:** ✅

    - Create a dedicated directory for admin-specific components: `src/app/components/admin/`.

2.  **Extract Tab Content:** ✅

    - Extract the JSX and associated logic for each tab (`dashboardTab`, `ordersTab`, `usersTab`, `settingsTab`) into its own component file within the new directory.
      - `src/app/components/admin/DashboardTab.js`
      - `src/app/components/admin/OrdersTab.js`
      - `src/app/components/admin/UsersTab.js`
      - `src/app/components/admin/SettingsTab.js`
    - These new components will receive necessary data (e.g., `orders`, `users`, `userCount`), state (e.g., `loading`, `error`), and handlers (e.g., `viewOrderDetails`, `setActiveTab`, `handleUserPageChange`) as props from the main `AdminPage`.
    - Consider extracting common UI elements like `loadingState` and `errorState` into shared components if needed. (Note: `loadingState` and `errorState` remain in `page.js` for now).

3.  **Extract Order Details Modal:** ✅

    - Move the `orderDetailsModal` JSX and logic into its own component: `src/app/components/admin/OrderDetailsModal.js`.
    - Pass necessary props like `selectedOrder`, `isOpen`, `onClose`, and helper functions (`formatDate`, `formatCurrency`, `getStatusColor`).

4.  **Extract Helper Functions:** ✅

    - Move utility functions (`formatDate`, `formatCurrency`, `getStatusColor`) to a separate utility file: `src/utils/formatters.js`.
    - Import these functions into `AdminPage` and pass them as props where needed.

5.  **Refactor `AdminPage` (`src/app/admin/page.js`):** ✅
    - Remove the large inline JSX blocks for tabs and the modal. (Done in steps 2 & 3)
    - Remove the helper function definitions (`formatDate`, `formatCurrency`, `getStatusColor`). (Done in step 4)
    - Import the newly created components (`DashboardTab`, `OrdersTab`, `UsersTab`, `SettingsTab`, `OrderDetailsModal`) and the helper functions from the utility file. (Done in steps 2, 3, 4)
    - Update the `tabComponents` object to render the imported tab components, passing down the required props. (Done in step 2)
    - Render the `OrderDetailsModal` component conditionally, passing its required props. (Done in step 3)
    - Retain the primary state management (`useState` hooks) and data fetching logic (`useEffect`) within `AdminPage`, making it function as a container component. (Verified)
