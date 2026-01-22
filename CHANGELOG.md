# WatchGuide Update - Release Notes (January 2026)

This update brings significant improvements to list management, cloud synchronization, and the overall user interface.

## 🚀 New Features

### ☁️ Cloud Sync for Custom Lists
*   **Universal Configuration**: Your custom list settings (like "Hub" vs "Row" layout, custom names, and thumbnails) now sync across all your devices via Trakt.
*   **Smart Merging**: The app intelligently merges lists from different devices, ensuring that your layout preferences (e.g., setting a list to "Row" on your phone) are respected everywhere.
*   **Auto-Refresh**: Focusing the app tab automatically pulls the latest configuration from the cloud, keeping your experience in sync instantly.

### 🛠️ Enhanced List Management
*   **Hub vs. Row Toggle**: You can now choose how each list appears on your home screen:
    *   **Hub Card**: A clickable card in the "Your Lists" row (great for large collections).
    *   **Content Row**: A full horizontal scrolling row of items directly on the home page (great for "Trending" or "Watchlist").
*   **Edit Functionality**: Added an **Edit** button to the "Manage Lists" page (`More -> Lists`). You can now manually switch a list between "Hub" and "Row" mode or update its custom thumbnail at any time.
*   **Visual Indicators**: The list management cards now show an icon indicating whether they are currently set as a "Hub" or "Row".

### 🎨 UI Refinements
*   **Cleaner Detail View**: 
    *   Moved action buttons (Plan to Watch, Watched, Like) from the hero overlay to the sidebar for a cleaner look.
    *   Replaced text titles with **High-Quality Logos** (where available) in the detail view.
    *   Logos are sized unobtrusively to ensure they look great on both mobile and desktop.
*   **Mobile Improvements**: 
    *   The "Your Lists" hub resize controls (Small/Medium/Large) are now available on mobile devices.
    *   Hidden the "Refresh Picks" button on mobile to reduce clutter.

## 🔧 Technical Improvements

*   **MDBList API Fixes**: Updated API integration to use absolute URLs (`https://api.mdblist.com`) and correct token exchange endpoints, resolving authentication issues in production environments.
*   **Robust Sync Logic**: Implemented content-based matching for lists to prevent duplicates and race conditions when syncing "Liked Lists" from Trakt.
*   **Performance**: Optimized list fetching to prioritize the cloud configuration as the source of truth for UI layouts.
