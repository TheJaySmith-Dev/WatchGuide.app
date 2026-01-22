I will update the MDBList service to use the direct API URL instead of the local proxy path. This will ensure that token exchange and API calls work correctly in production (where the Vite proxy is not available) and strictly follow the URL requirements you provided.

**Planned Changes:**

1. **Modify** **`services/mdblist.ts`**:

   * Update `TOKEN_URL` to `'https://api.mdblist.com/oauth/token/'` (ensuring the trailing slash is present).

   * Update `API_BASE` to `'https://api.mdblist.com'`.

   * This removes the dependency on `/mdblist-api` proxy which was causing issues in production.

2. **Verify**:

   * Confirm that the token exchange method remains `POST`.

   * Confirm that other API calls (like `getUserLists`) will now use the correct absolute URL.

