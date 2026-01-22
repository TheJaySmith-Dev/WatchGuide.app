I have researched the syncing mechanisms and found that while list *content* (items) syncs via Trakt/MDBList APIs, the *configuration* (like "Hub" vs "Row" view type, custom thumbnails, and merged list definitions) is currently only stored in `localStorage` (`custom_lists`).

To make these configurations sync across devices, I need to implement a mechanism to store this metadata in the cloud. Since we don't have our own backend, I will use **Trakt's User Settings / Personal Lists** feature creatively to store this config.

**The Plan:**

1.  **Sync Strategy**:
    *   I will use a specific, hidden Trakt Personal List named `WatchGuide Config` to store our app's configuration JSON.
    *   The configuration (view types, merged list definitions, custom thumbnails) will be serialized into the `description` field of this list, as Trakt allows reasonably long descriptions.
    *   Alternatively, if the description length is too limited for all configs, I can use the list *items* themselves to represent configs (e.g., adding a specific "placeholder" movie and using its notes/metadata), but using the list description is cleaner for a single JSON blob.

2.  **Implementation Steps**:
    *   **Modify `StorageService`**:
        *   Add `syncConfigToTrakt()`: Creates/Updates a private list `watchguide-config` on Trakt. It writes the `customLists` array (serialized) to the list's `description`.
        *   Add `fetchConfigFromTrakt()`: Searches for this specific list on startup. If found, parses the `description` and merges it with local storage (preferring the cloud version or latest timestamp).
    *   **Update `AddListModal` & `StorageService`**:
        *   Whenever a user creates/edits a list (changing view type or thumbnail), trigger `syncConfigToTrakt()` to push changes.
    *   **Auto-Sync**:
        *   Call `fetchConfigFromTrakt()` on app launch (in `App.tsx` or `StorageService` init) to pull the latest layout from other devices.

3.  **Fallback**:
    *   If the user is not logged into Trakt, it will fallback to `localStorage` as it does now (local-only).
    *   MDBList doesn't offer a convenient arbitrary storage endpoint, so Trakt will be the primary sync engine for configuration.

This approach leverages the existing Trakt integration to provide "Cloud Sync" for app preferences without needing a new server.