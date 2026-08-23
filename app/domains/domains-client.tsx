"use client";
import { FormEvent, useEffect, useState } from "react";

type DomainRecord = { id: string; domain: string; ownershipToken: string; expectedCname: string; txtName: string; txtValue: string; status: string; failureReason?: string | null };
type DomainPayload = { domains: DomainRecord[]; customDomainsEligible: boolean; defaultSiteUrl: string; defaultSiteHost: string };

const statusConfig: Record<string, { icon: string; color: string; label: string; description: string }> = {
  setup_required: { icon: "📝", color: "#fbbf24", label: "Setup Required", description: "Add DNS records to verify ownership" },
  checking: { icon: "⏳", color: "#6b7280", label: "Checking", description: "Verifying DNS records" },
  verified: { icon: "✓", color: "#10b981", label: "Verified", description: "Ownership confirmed" },
  ssl_pending: { icon: "🔒", color: "#3b82f6", label: "SSL Pending", description: "TLS certificate is being provisioned" },
  active: { icon: "✓✓", color: "#059669", label: "Active", description: "Ready to use" },
  failed: { icon: "✗", color: "#ef4444", label: "Failed", description: "Verification failed" },
  disabled: { icon: "○", color: "#9ca3af", label: "Disabled", description: "Domain is disabled" },
};

const styles = `
  .domain-card {
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
  }

  .domain-default-card {
    display: grid;
    gap: 0.9rem;
    align-items: start;
  }

  .domain-default-card span {
    font-size: 0.72rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 800;
    color: var(--tool-accent, #0f766e);
  }

  .domain-default-card h2 {
    margin: 0;
    font-size: clamp(1.4rem, 3vw, 2.3rem);
    word-break: break-word;
  }

  .domain-default-card p,
  .domain-plan-note {
    color: #5b6c66;
    line-height: 1.6;
  }

  .domain-default-card a {
    width: fit-content;
    text-decoration: none;
  }

  .domain-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .domain-title-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
  }

  .status-badge {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    color: white;
    font-weight: 500;
    min-width: fit-content;
    flex-shrink: 0;
  }

  .status-icon {
    font-size: 1.25rem;
  }

  .status-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .status-label {
    font-size: 0.875rem;
    font-weight: 600;
  }

  .status-description {
    font-size: 0.75rem;
    opacity: 0.9;
  }

  .domain-name {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .icon-button {
    background: none;
    border: none;
    color: #6b7280;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem;
    transition: color 0.2s;
  }

  .icon-button:hover:not(:disabled) {
    color: #ef4444;
  }

  .icon-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .domain-content {
    display: none;
    padding: 1.5rem 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .domain-content[data-expanded="true"] {
    display: block;
  }

  .dns-instructions {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .instruction-group {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 0.5rem;
    border-left: 3px solid #3b82f6;
  }

  .instruction-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    font-weight: 600;
    color: #1f2937;
  }

  .instruction-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .instruction-detail {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-left: 2.25rem;
  }

  .field-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .field-group label {
    font-weight: 500;
    color: #6b7280;
    font-size: 0.875rem;
    min-width: 50px;
  }

  .copyable {
    flex: 1;
    padding: 0.5rem 0.75rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-family: monospace;
    color: #1f2937;
    word-break: break-all;
    cursor: pointer;
    transition: all 0.2s;
  }

  .copyable:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .error-alert {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: #fee2e2;
    border: 1px solid #fca5a5;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    color: #991b1b;
  }

  .error-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .error-title {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .error-message {
    font-size: 0.875rem;
    opacity: 0.9;
  }

  .domain-actions {
    display: flex;
    gap: 0.75rem;
    padding-top: 1rem;
    flex-wrap: wrap;
  }

  .expand-button {
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: #4b5563;
    transition: all 0.2s;
  }

  .expand-button:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .expand-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-button {
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: #4b5563;
    transition: all 0.2s;
  }

  .action-button:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-button.primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .action-button.primary:hover:not(:disabled) {
    background: #2563eb;
    border-color: #2563eb;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 2rem;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-state h2 {
    margin: 0 0 0.5rem;
    color: #1f2937;
  }

  .empty-state p {
    margin: 0;
    color: #6b7280;
  }

  .domain-check {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: #f0f9ff;
    border: 1px solid #bfdbfe;
    border-radius: 0.5rem;
  }

  .check-form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .check-form-group label {
    font-weight: 500;
    color: #1f2937;
    font-size: 0.875rem;
  }

  .check-form-group input {
    padding: 0.5rem 0.75rem;
    border: 1px solid #93c5fd;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-family: monospace;
  }

  .check-form-group input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .check-button {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }

  .check-button:hover:not(:disabled) {
    background: #2563eb;
  }

  .check-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .tool-page.domain-page {
      min-height: 100vh;
      padding: 1rem 1rem 6rem;
      background: linear-gradient(180deg, #f8fbf8 0%, #eef6f2 100%);
    }

    .domain-topbar {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      min-height: 3.6rem;
      margin: -0.25rem -0.1rem 1rem;
      padding-bottom: 0.8rem;
      border-bottom: 1px solid #dfe9e4;
    }

    .domain-menu-dot {
      display: grid;
      place-items: center;
      width: 2.35rem;
      height: 2.35rem;
      border: 1px solid #dfe9e4;
      border-radius: 0.75rem;
      background: #ffffff;
      color: #123d35;
      font-weight: 900;
      text-decoration: none;
    }

    .domain-app-mark {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      color: #123d35;
      font-size: 0.82rem;
      font-weight: 950;
      letter-spacing: 0.16em;
      text-decoration: none;
    }

    .domain-app-mark i {
      width: 1.75rem;
      height: 1.75rem;
      display: grid;
      place-items: center;
      border-radius: 0.45rem;
      background: #174b41;
      color: #e6bd5f;
      font-style: normal;
    }

    .domain-breadcrumbs {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      color: #65776f;
      font-size: 0.72rem;
      margin: 0.55rem 0 1rem;
      overflow-x: auto;
      white-space: nowrap;
    }

    .domain-page .back {
      display: inline-flex;
      margin: 0 0 1.45rem;
      font-size: 0.78rem;
      color: #236257;
      font-weight: 850;
      text-decoration: none;
    }

    .domain-page .tool-hero {
      padding: 0;
      margin-bottom: 1.25rem;
    }

    .domain-page .tool-hero h1 {
      font-size: clamp(2rem, 11vw, 2.75rem);
      line-height: 0.98;
      margin: 0.4rem 0 0.4rem;
    }

    .domain-page .tool-hero p {
      max-width: 31rem;
      color: #5c6d66;
      font-size: 0.92rem;
      line-height: 1.52;
    }

    .domain-default-card,
    .domain-form,
    .domain-help-card {
      border: 1px solid #e3ebe7;
      border-radius: 0.9rem;
      background: #ffffff;
      box-shadow: 0 1rem 2.5rem rgba(16, 52, 45, 0.08);
      padding: 1.15rem;
    }

    .domain-card-shell {
      display: grid;
      grid-template-columns: 3.4rem minmax(0, 1fr);
      gap: 1rem;
      align-items: start;
    }

    .domain-card-icon {
      width: 3.4rem;
      height: 3.4rem;
      display: grid;
      place-items: center;
      border-radius: 0.75rem;
      background: #edf8f3;
      color: #17685b;
      font-size: 1.75rem;
    }

    .domain-default-card h2 {
      font-size: 1.35rem;
      line-height: 1.15;
    }

    .domain-card-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .domain-card-actions a,
    .domain-card-actions button,
    .domain-form button {
      width: 100%;
      min-height: 3rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.55rem;
      font-size: 0.8rem;
      font-weight: 900;
      text-decoration: none;
    }

    .domain-card-actions .copy-address {
      border: 1px solid #1d5a50;
      background: #fff;
      color: #123d35;
    }

    .domain-form {
      margin-top: 1rem;
    }

    .domain-form label {
      display: grid;
      gap: 0.45rem;
      color: #143b34;
      font-weight: 850;
    }

    .domain-form input {
      min-height: 3.2rem;
      border-radius: 0.7rem;
      font-size: 1rem;
    }

    .domain-plan-badge {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin: 0.8rem 0;
      padding: 0.9rem;
      border-radius: 0.7rem;
      background: #f3f6f2;
      color: #435850;
      font-size: 0.8rem;
      line-height: 1.4;
    }

    .domain-help-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.8rem;
      margin-top: 1rem;
      background: #eef6f1;
      color: #123d35;
    }

    .domain-help-card b,
    .domain-help-card small {
      display: block;
    }

    .domain-help-card small {
      margin-top: 0.25rem;
      color: #5b6c66;
    }

    .domain-title-section {
      flex-direction: column;
      align-items: flex-start;
    }

    .status-badge {
      width: 100%;
    }

    .domain-actions {
      flex-direction: column;
    }

    .action-button {
      width: 100%;
    }
  }

  @media (min-width: 641px) {
    .domain-topbar,
    .domain-breadcrumbs,
    .domain-help-card {
      display: none;
    }
  }
`;

export default function DomainClient() {
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [customDomainsEligible, setCustomDomainsEligible] = useState(true);
  const [defaultSiteUrl, setDefaultSiteUrl] = useState("");
  const [defaultSiteHost, setDefaultSiteHost] = useState("");
  const [domain, setDomain] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/domains", { cache: "no-store" });
    const body = await response.json() as DomainPayload & { error?: string };
    if (!response.ok) throw new Error(body.error || "Domains could not be loaded.");
    setDomains(body.domains || []);
    setCustomDomainsEligible(Boolean(body.customDomainsEligible));
    setDefaultSiteUrl(body.defaultSiteUrl || "");
    setDefaultSiteHost(body.defaultSiteHost || "");
  }
  useEffect(() => { load().catch((err) => setError(err.message)); }, []);
  
  async function call(method: string, body: Record<string, unknown>) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/domains", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Domain update failed.");
      setMessage("Domain settings updated.");
      setDomain("");
      setExpandedDomain(null);
      await load();
    } catch (err: any) {
      setError(err.message || "Domain update failed.");
    } finally {
      setBusy(false);
    }
  }
  
  function add(event: FormEvent) {
    event.preventDefault();
    call("POST", { domain });
  }

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, []);

  return <main className="tool-page domain-page">
    <header className="domain-topbar" aria-label="Workspace navigation">
      <a className="domain-menu-dot" href="/workspace" aria-label="Return to workspace">‹</a>
      <a className="domain-app-mark" href="/workspace"><i>E</i><span>ESTARA</span></a>
    </header>
    <nav className="domain-breadcrumbs" aria-label="Breadcrumbs"><span>Home</span><span>/</span><span>Workspace</span><span>/</span><strong>Agency Website</strong><span>/</span><strong>Domains</strong></nav>
    <a className="back" href="/workspace">Return to workspace</a>
    <section className="tool-hero"><span>Agency website</span><h1>Domains & Website</h1><p>Manage how customers access your agency website.</p></section>
    
    {error && <div className="notice" role="alert">{error}</div>}
    {message && <div className="notice success">{message}</div>}

    <section className="tool-card domain-default-card">
      <div className="domain-card-shell">
        <i className="domain-card-icon" aria-hidden="true">◎</i>
        <div>
          <span>Included website</span>
          <h2>{defaultSiteHost || "Public website address not configured"}</h2>
          <p>Your ESTARA website is live and ready to share. Use this address to attract visitors and get leads.</p>
          <p className="sr-only">In Cloudflare, keep app.estara.co.zw explicit, add a proxied wildcard DNS record for *.estara.co.zw, and attach the Worker route *.estara.co.zw/* so every agency slug resolves here.</p>
          <div className="domain-card-actions">
            {defaultSiteUrl ? <a className="primary" href={defaultSiteUrl} target="_blank" rel="noreferrer">Open website</a> : <a className="outline" href="/admin">Configure suffix</a>}
            <button className="copy-address" type="button" disabled={!defaultSiteHost} onClick={() => { if (defaultSiteHost) navigator.clipboard.writeText(defaultSiteHost); setMessage("Website address copied."); }}>Copy address</button>
          </div>
        </div>
      </div>
    </section>
    
    <form className="tool-card domain-form" onSubmit={add}>
      <label>Custom domain name<input required disabled={!customDomainsEligible || busy} value={domain} onChange={event => setDomain(event.target.value)} placeholder="www.agency.co.zw" /></label>
      <button disabled={busy || !customDomainsEligible}>{busy ? "Saving..." : "Add custom domain"}</button>
      {!customDomainsEligible && <p className="domain-plan-badge">🔒 Available on Professional plan and above.</p>}
    </form>

    <section className="domain-help-card"><div><b>Need help connecting a domain?</b><small>View the step-by-step DNS guide.</small></div><a href="/docs">View guide →</a></section>

    <section className="tool-grid domain-grid">
      {domains.length > 0 ? (
        domains.map(item => {
          const config = statusConfig[item.status] || statusConfig.setup_required;
          const isExpanded = expandedDomain === item.id;
          return (
            <article className="tool-card domain-card" key={item.id}>
              <header className="domain-header">
                <div className="domain-title-section">
                  <div className="status-badge" style={{ backgroundColor: config.color }}>
                    <span className="status-icon">{config.icon}</span>
                    <div className="status-info">
                      <div className="status-label">{config.label}</div>
                      <div className="status-description">{config.description}</div>
                    </div>
                  </div>
                  <h2 className="domain-name">{item.domain}</h2>
                </div>
                <button 
                  className="icon-button" 
                  disabled={busy} 
                  onClick={() => call("PATCH", { id: item.id, action: "disable" })}
                  title="Disable domain"
                >
                  ✕
                </button>
              </header>

              <div className="domain-content" data-expanded={isExpanded}>
                <div className="dns-instructions">
                  <div className="instruction-group">
                    <div className="instruction-header">
                      <span className="instruction-icon">1</span>
                      <span>Add TXT Record</span>
                    </div>
                    <div className="instruction-detail">
                      <div className="field-group">
                        <label>Name:</label>
                        <code className="copyable" onClick={() => navigator.clipboard.writeText(item.txtName)}>{item.txtName}</code>
                      </div>
                      <div className="field-group">
                        <label>Value:</label>
                        <code className="copyable" onClick={() => navigator.clipboard.writeText(item.txtValue)}>{item.txtValue}</code>
                      </div>
                    </div>
                  </div>

                  <div className="instruction-group">
                    <div className="instruction-header">
                      <span className="instruction-icon">2</span>
                      <span>Add CNAME Record</span>
                    </div>
                    <div className="instruction-detail">
                      <div className="field-group">
                        <label>Target:</label>
                        <code className="copyable" onClick={() => navigator.clipboard.writeText(item.expectedCname)}>{item.expectedCname}</code>
                      </div>
                    </div>
                  </div>
                </div>

                {item.failureReason && (
                  <div className="error-alert">
                    <span className="error-icon">⚠</span>
                    <div>
                      <div className="error-title">Verification failed</div>
                      <div className="error-message">{item.failureReason}</div>
                    </div>
                  </div>
                )}

                <DomainCheck id={item.id} busy={busy} call={call} />
              </div>

              <footer className="domain-actions">
                <button 
                  className="expand-button"
                  onClick={() => setExpandedDomain(isExpanded ? null : item.id)}
                  disabled={busy}
                >
                  {isExpanded ? "Hide details" : "Show details"}
                </button>
                <button 
                  disabled={busy || item.status !== "verified"} 
                  onClick={() => call("PATCH", { id: item.id, action: "request_ssl" })}
                  className="action-button"
                >
                  Request TLS
                </button>
                <button 
                  disabled={busy || !["verified", "ssl_pending"].includes(item.status)} 
                  onClick={() => call("PATCH", { id: item.id, action: "activate" })}
                  className="action-button primary"
                >
                  Activate
                </button>
              </footer>
            </article>
          );
        })
      ) : (
        <article className="tool-card empty-state">
          <div className="empty-icon">🌐</div>
          <h2>No custom domains yet</h2>
          <p>Add a domain when the agency is ready to route public visitors from its own website address.</p>
        </article>
      )}
    </section>
  </main>;
}

function DomainCheck({ id, busy, call }: { id: string; busy: boolean; call: (method: string, body: Record<string, unknown>) => void }) {
  const [observedTxt, setTxt] = useState("");
  const [observedCname, setCname] = useState("");
  
  return <form className="domain-check" onSubmit={event => { event.preventDefault(); call("PATCH", { id, action: "check_dns", observedTxt, observedCname }); }}>
    <div className="check-form-group">
      <label>Observed TXT value</label>
      <input required value={observedTxt} onChange={event => setTxt(event.target.value)} placeholder="Paste the TXT value from your DNS provider" />
    </div>
    <div className="check-form-group">
      <label>Observed CNAME target</label>
      <input required value={observedCname} onChange={event => setCname(event.target.value)} placeholder="Paste the CNAME target from your DNS provider" />
    </div>
    <button disabled={busy} className="check-button">{busy ? "Checking..." : "Verify DNS"}</button>
  </form>;
}
