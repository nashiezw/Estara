"use client";

import { useCallback, useEffect, useState } from "react";

type AuditEvent = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
};

export default function AuditClient() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch(`/api/audit?action=${encodeURIComponent(filter)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Audit history could not be loaded.");
      setEvents(body.events || []);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <section className="tool-hero">
        <a href="/workspace">Back to workspace</a>
        <span>Governance</span>
        <h1>Audit history</h1>
        <p>A tenant-isolated, chronological record of sensitive actions across your agency.</p>
        <input
          aria-label="Filter audit events"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter by action..."
        />
      </section>
      <section className="timeline" aria-live="polite">
        {status === "loading" && <p>Loading audit history...</p>}
        {status === "error" && (
          <div role="alert">
            <strong>Audit history could not be loaded.</strong>
            <p>Check the connection and try again.</p>
            <button className="outline" onClick={load}>Try again</button>
          </div>
        )}
        {status === "ready" && events.map((event) => (
          <article key={event.id}>
            <i />
            <div>
              <small>{new Date(event.createdAt).toLocaleString()}</small>
              <strong>{event.action.replaceAll(".", " / ")}</strong>
              <p>{event.resourceType} / {event.resourceId}</p>
            </div>
          </article>
        ))}
        {status === "ready" && !events.length && <p>No audit events match this filter.</p>}
      </section>
    </>
  );
}
