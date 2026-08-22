"use client";

import { FormEvent, useEffect, useState } from "react";

type Role = { id: string; name: string; permissions: string[] };

const labels: Record<string, string> = {
  "agency.settings.manage": "Manage agency settings",
  "team.manage": "Manage team and roles",
  "property.read": "View properties",
  "property.create": "Create properties",
  "property.publish": "Publish properties",
  "property.media.manage": "Manage property media",
  "enquiry.read": "View enquiries",
  "enquiry.create": "Create enquiries",
  "enquiry.contact": "Contact enquiry leads",
  "audit.read": "View audit history",
  "action.read": "View next actions",
  "action.manage": "Manage next actions",
  "viewing.read": "View appointments",
  "viewing.manage": "Manage appointments",
  "seller.manage": "Manage seller access",
};

export default function RolesClient({ platform }: { platform: { shortName: string } }) {
  const [data, setData] = useState<{ roles: Role[]; permissions: string[] }>({ roles: [], permissions: [] });
  const [editing, setEditing] = useState<Role | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [grants, setGrants] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    fetch("/api/roles")
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setData(body);
        setInviteRole(current => current || body.roles[0]?.id || "");
      })
      .catch(reason => setError(reason.message || "Roles could not be loaded."));

  useEffect(load, []);

  const reset = () => {
    setEditing(null);
    setName("");
    setGrants([]);
  };

  const select = (role: Role) => {
    setEditing(role);
    setName(role.name);
    setGrants(role.permissions);
    setPendingDelete(null);
    setMessage("");
    setError("");
  };

  const toggle = (permission: string) => setGrants(current => (current.includes(permission) ? current.filter(item => item !== permission) : [...current, permission]));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/roles", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editing?.id, name, permissions: grants }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setMessage(editing ? "Role permissions updated." : "Custom role created.");
      reset();
      load();
    } catch (reason: any) {
      setError(reason.message || "Role could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (role: Role) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/roles?id=${encodeURIComponent(role.id)}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setMessage("Custom role deleted.");
      setPendingDelete(null);
      if (editing?.id === role.id) reset();
      load();
    } catch (reason: any) {
      setError(reason.message || "Role could not be deleted.");
    } finally {
      setBusy(false);
    }
  };

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      const link = location.origin + body.invitation.acceptPath;
      setInviteLink(link);
      await navigator.clipboard?.writeText(link);
      setEmail("");
      setMessage("Custom-role invitation created and copied.");
    } catch (reason: any) {
      setError(reason.message || "Invitation could not be created.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="roles-page"><nav><a href="/workspace">Back to team workspace</a><strong>{platform.shortName} <small>Agency access</small></strong></nav><header><span>LEAST-PRIVILEGE ACCESS</span><h1>Custom roles</h1><p>Create precise access profiles for valuers, photographers, interns, branch coordinators and other agency collaborators.</p></header><section className="roles-layout"><aside><div><span>YOUR ROLES</span><button onClick={reset}>+ New role</button></div>{data.roles.length ? data.roles.map(role => <article className={editing?.id === role.id ? "active" : ""} key={role.id}><button type="button" className="role-select" onClick={() => select(role)}><strong>{role.name}</strong><small>{role.permissions.length} permission{role.permissions.length === 1 ? "" : "s"}</small></button><button aria-label={`Review deletion for ${role.name}`} onClick={event => { event.stopPropagation(); setPendingDelete(role); }}>Delete</button>{pendingDelete?.id === role.id && <div className="role-delete-review" role="region" aria-label={`Confirm deletion for ${role.name}`}><strong>Delete {role.name}?</strong><small>This removes the custom role after the server confirms it is safe to delete.</small><button disabled={busy} onClick={() => remove(role)}>Delete role</button><button disabled={busy} onClick={() => setPendingDelete(null)}>Cancel</button></div>}</article>) : <p>No custom roles yet. Your built-in Principal, Admin, Agent, Marketing and Viewer roles remain available.</p>}{data.roles.length > 0 && <form className="role-invite" onSubmit={invite}><span>INVITE WITH CUSTOM ROLE</span><input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="colleague@agency.co.zw"/><select required value={inviteRole} onChange={event => setInviteRole(event.target.value)}>{data.roles.map(role => <option value={role.id} key={role.id}>{role.name}</option>)}</select><button disabled={busy}>Create invitation</button>{inviteLink && <input readOnly value={inviteLink} onFocus={event => event.currentTarget.select()}/>}</form>}</aside><form onSubmit={save}><span>{editing ? "EDIT ROLE" : "NEW ROLE"}</span><h2>{editing ? editing.name : "Design a role"}</h2><label>Role name<input required minLength={2} maxLength={60} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Viewing coordinator"/></label><fieldset><legend>Allowed actions</legend><div>{data.permissions.map(permission => <label className={grants.includes(permission) ? "selected" : ""} key={permission}><input type="checkbox" aria-label={labels[permission] || permission} checked={grants.includes(permission)} onChange={() => toggle(permission)}/><span><strong>{labels[permission] || permission}</strong><small>{permission}</small></span></label>)}</div></fieldset>{error && <p className="roles-error">{error}</p>}{message && <p className="roles-message">{message}</p>}<footer><button type="button" onClick={reset}>Clear</button><button className="roles-primary" disabled={busy || !name.trim() || !grants.length}>{busy ? "Saving..." : editing ? "Save changes" : "Create role"}</button></footer></form></section></main>;
}
