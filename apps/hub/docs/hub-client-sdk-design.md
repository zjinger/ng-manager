# Hub Client SDK Design

Last Updated: 2026-03-06

## Purpose

`hub-client` is a reusable SDK used by:

- ngm-cli
- ngm-desktop

It abstracts communication with **ngm-hub**.

Goals:

- Decouple client applications from hub API
- Provide retry logic
- Gracefully degrade if hub is unavailable

---

# Package Location

```
packages/hub-client
```

---

# Directory Structure

```
packages/hub-client
├─ src
│  ├─ hub-client.ts
│  ├─ feedback-client.ts
│  ├─ announcement-client.ts
│  ├─ release-client.ts
│  ├─ ws-client.ts
│  └─ types.ts
```

---

# Hub Client Interface

```
export interface HubClientOptions {
  baseUrl: string
  timeoutMs?: number
}
```

Main client:

```
export interface HubClient {

  listAnnouncements(): Promise<AnnouncementSummary[]>

  getLatestRelease(channel: "desktop" | "cli"):
    Promise<ReleaseSummary | null>

  submitFeedback(input: CreateFeedbackInput):
    Promise<{ id: string }>

  connectWs(handler:(event:HubWsEvent)=>void):
    { close():void }

}
```

---

# Feedback Client

```
POST /api/client/feedback
POST /api/client/feedback/:id/attachments
```

Example:

```
await hubClient.submitFeedback({
  type:"bug",
  title:"CLI start failure",
  content:"ngm ui returned error"
})
```

---

# Announcement Client

```
GET /api/client/announcements
GET /api/client/announcements/:id
```

Used by desktop to display announcement drawer.

---

# Release Client

```
GET /api/client/releases/latest
```

Example response:

```
{
  "version":"0.3.0",
  "title":"New Release",
  "downloadUrl":"https://downloads/ngm-0.3.0.exe"
}
```

---

# WebSocket Client

Endpoint:

```
/ws
```

Example:

```
const ws = hubClient.connectWs(event => {
  if(event.type === "release.published"){
    console.log("New version available")
  }
})
```

---

# Error Handling

If hub is unavailable:

- client should not throw fatal errors
- operations fail gracefully
- local features remain functional

---

# Summary

The hub-client SDK ensures ng-manager clients remain **loosely coupled** with the hub service.
