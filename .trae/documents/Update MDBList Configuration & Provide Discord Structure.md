I will implement the requested changes to the MDBList configuration and provide the Discord server structure you asked for.

### **1. MDBList API Update**
I will update `services/mdblist.ts` to use the direct production URL instead of the local proxy path (which was likely causing issues in production).

*   **Change `TOKEN_URL`**:
    *   From: `'/mdblist-api/oauth/token/'`
    *   To: `'https://api.mdblist.com/oauth/token/'` (Ensuring the trailing slash is present as requested).
*   **Change `API_BASE`**:
    *   From: `'/mdblist-api'`
    *   To: `'https://api.mdblist.com'`

### **2. Discord Server Structure**
Here is a recommended setup for your "WatchGuide" community:

**👑 Roles & Permissions**
*   **Admin**: Administrator (All permissions).
*   **Moderator**: Manage Messages, Kick/Ban, Manage Roles (lower), View Audit Log.
*   **Dev Team**: Manage Webhooks, Send Messages, Embed Links (for GitHub updates).
*   **Verified**: Send Messages, Connect to Voice, Add Reactions.
*   **Member**: Read Message History (View only until verified, or limited access).

**Tb Categories & Channels**

**📂 INFORMATION**
*   `#👋-welcome`: System messages for new joins.
*   `#📜-rules`: Read-only channel with server rules.
*   `#📢-announcements`: Project updates (like the one we just wrote!).
*   `#🔗-links`: Official links (Website, GitHub, etc.).

**📂 COMMUNITY**
*   `#💬-general`: General chat for members.
*   `#🎬-movies-tv`: Discussion about what everyone is watching.
*   `#🍿-recommendations`: Share your favorite lists or hidden gems.
*   `#🤖-bot-commands`: For music bots or level checking.

**📂 SUPPORT & FEEDBACK**
*   `#🆘-help-desk`: User support for the app.
*   `#🐛-bug-reports`: Dedicated channel for reporting issues.
*   `#✨-feature-requests`: Users can suggest new ideas (like the "Hub" vs "Row" feature).

**📂 DEVELOPMENT**
*   `#🔨-dev-updates`: GitHub webhooks feed (commits/PRs).
*   `#🚀-roadmap`: Future plans for the app.

**🔊 VOICE**
*   `🔊 General Lounge`
*   `🔊 Watch Party`
