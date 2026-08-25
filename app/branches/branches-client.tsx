"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Branch = { id: string; name: string; location: string; phone: string; whatsapp: string; email: string; address: string; description: string; openingHours: string; publicEnabled: number | boolean; managerUserId: string; managerEmail: string; active: number | boolean; properties: number; liveProperties: number; enquiries: number };
type Member = { userId: string; email: string; role: string };
type Assignment = { branchId: string; userId: string; email: string };
type Property = { id: string; title: string; ref: string; status: string; branchId: string | null };
type FormState = Pick<Branch, "name" | "location" | "phone" | "whatsapp" | "email" | "address" | "description" | "openingHours"> & { managerUserId: string; publicEnabled: boolean };

const blank: FormState = { name: "", location: "", phone: "", whatsapp: "", email: "", address: "", description: "", openingHours: "", managerUserId: "", publicEnabled: true };
const isActive = (branch?: Branch) => Boolean(branch?.active);
const isPublic = (branch?: Branch) => Boolean(branch?.publicEnabled);
const initials = (value = "") => value.split(/\s+/).map(word => word[0]).join("").slice(0, 2).toUpperCase() || "BR";
const toForm = (branch: Branch): FormState => ({ name: branch.name || "", location: branch.location || "", phone: branch.phone || "", whatsapp: branch.whatsapp || "", email: branch.email || "", address: branch.address || "", description: branch.description || "", openingHours: branch.openingHours || "", managerUserId: branch.managerUserId || "", publicEnabled: isPublic(branch) });

export default function BranchesClient({ platform }: { platform: { shortName: string; logoUrl?: string; iconUrl?: string } }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [selectedId, setSelectedId] = useState("");
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(blank);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = branches.find(branch => branch.id === selectedId) || branches[0];
  const maxBranches = Number(plan?.limits?.maxBranches || 0);
  const remaining = maxBranches ? Math.max(0, maxBranches - branches.filter(isActive).length) : null;
  const assignedTeam = useMemo(() => selected ? assignments.filter(item => item.branchId === selected.id) : [], [assignments, selected]);
  const branchProperties = useMemo(() => selected ? properties.filter(property => property.branchId === selected.id) : [], [properties, selected]);
  const assignableProperties = useMemo(() => selected ? properties.filter(property => !property.branchId || property.branchId === selected.id) : [], [properties, selected]);

  const load = async () => {
    const [b, w, s] = await Promise.all([
      fetch("/api/branches").then(r => r.json()),
      fetch("/api/workspace").then(r => r.json()),
      fetch("/api/subscription").then(r => r.json()).catch(() => ({})),
    ]);
    const next = b.branches || [];
    setBranches(next);
    setAssignments(b.assignments || []);
    setProperties(b.properties || []);
    setMembers(w.members || []);
    setPlan(s.plan || null);
    setSelectedId(id => id && next.some((branch: Branch) => branch.id === id) ? id : next[0]?.id || "");
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (mode === "edit" && selected) setForm(toForm(selected));
    if (selected) setSelectedProperties(branchProperties.map(property => property.id));
  }, [selected?.id, mode, branchProperties.length]);

  const update = (patch: Partial<FormState>) => setForm(current => ({ ...current, ...patch }));
  const request = async (body: Record<string, unknown>, method = "PATCH") => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/branches", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Branch could not be saved.");
      await load();
      return true;
    } catch (error: any) {
      setMessage(error.message || "Branch could not be saved.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveBranch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ok = mode === "create" ? await request(form, "POST") : await request({ ...form, id: selected?.id, action: "update" });
    if (ok) {
      setMessage(mode === "create" ? "Branch created and ready for team assignment." : "Branch details updated.");
      if (mode === "create") setForm(blank);
      setMode("create");
    }
  };
  const edit = (branch: Branch) => { setSelectedId(branch.id); setMode("edit"); setForm(toForm(branch)); };
  const toggle = async (branch: Branch) => { if (await request({ id: branch.id, active: !isActive(branch) })) setMessage(isActive(branch) ? "Branch archived. Existing property history stays intact." : "Branch reactivated."); };
  const remove = async (branch: Branch) => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/branches?id=${encodeURIComponent(branch.id)}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Branch could not be deleted.");
      await load();
      setMessage("Empty branch deleted.");
    } catch (error: any) { setMessage(error.message || "Branch could not be deleted."); }
    finally { setBusy(false); }
  };
  const assignMember = async (userId: string, assigned: boolean) => selected && request({ action: "assign", branchId: selected.id, userId, assigned }).then(ok => ok && setMessage(assigned ? "Team member scoped to this branch." : "Branch access removed."));
  const saveProperties = async () => selected && request({ action: "assign_properties", branchId: selected.id, propertyIds: selectedProperties }).then(ok => ok && setMessage("Branch property ownership updated."));
  const toggleProperty = (id: string) => setSelectedProperties(list => list.includes(id) ? list.filter(item => item !== id) : [...list, id]);

  return <main className="branches-page">
    <nav className="branch-topbar"><a href="/workspace">Back to workspace</a><strong>{platform.iconUrl&&<img className="branch-platform-icon" src={platform.iconUrl} alt="" />}{platform.logoUrl?<img className="branch-platform-logo" src={platform.logoUrl} alt={platform.shortName} />:<span>{platform.shortName}</span>}<small>Team / Branches & offices</small></strong></nav>
    <header className="branch-hero">
      <div><span>BRANCH NETWORK</span><h1>Branches & offices</h1><p>Structure the agency by real offices, assign managers and team scope, and decide which branch details appear on the public website.</p></div>
      <aside><strong>{branches.filter(isActive).length}</strong><small>{maxBranches ? `of ${maxBranches} active branches` : "active branches"}</small><b>{remaining === 0 ? "Plan limit reached" : remaining === null ? "No plan cap" : `${remaining} slots left`}</b></aside>
    </header>
    <section className="branch-metrics">
      <article><strong>{branches.reduce((sum, branch) => sum + Number(branch.properties || 0), 0)}</strong><span>owned listings</span></article>
      <article><strong>{branches.reduce((sum, branch) => sum + Number(branch.liveProperties || 0), 0)}</strong><span>live listings</span></article>
      <article><strong>{assignments.length}</strong><span>scoped members</span></article>
      <article><strong>{branches.filter(isPublic).length}</strong><span>public offices</span></article>
    </section>
    <section className="branch-workbench">
      <div className="branch-directory">
        <div className="branch-section-head"><span>OFFICE DIRECTORY</span><button onClick={() => { setMode("create"); setForm(blank); }}>New branch</button></div>
        {branches.map(branch => <article className={`branch-card ${selected?.id === branch.id ? "selected" : ""} ${!isActive(branch) ? "archived" : ""}`} key={branch.id} onClick={() => setSelectedId(branch.id)}>
          <i>{initials(branch.name)}</i><div><small>{isActive(branch) ? isPublic(branch) ? "PUBLIC OFFICE" : "INTERNAL OFFICE" : "ARCHIVED"}</small><h2>{branch.name}</h2><p>{branch.location || branch.address || "Location not set"}</p><footer><span>{branch.managerEmail || "No manager"}</span><span>{branch.properties || 0} listings</span></footer></div>
          <button onClick={event => { event.stopPropagation(); edit(branch); }}>Edit</button>
        </article>)}
        {!branches.length && <article className="branch-empty"><span>FIRST OFFICE</span><h2>Create the first branch.</h2><p>Start with the office that owns new listings, then assign managers and public contact details.</p></article>}
      </div>
      <form className="branch-editor" id="branch-create" onSubmit={saveBranch}>
        <div className="branch-section-head"><span>{mode === "create" ? "NEW BRANCH" : "EDIT BRANCH"}</span>{mode === "edit" && <button type="button" onClick={() => { setMode("create"); setForm(blank); }}>Cancel edit</button>}</div>
        <h2>{mode === "create" ? "Add an office" : form.name || "Edit office"}</h2>
        <div className="branch-form-grid">
          <label className="wide">Branch name<input required value={form.name} onChange={event => update({ name: event.target.value })} placeholder="Borrowdale office" /></label>
          <label>Area or city<input value={form.location} onChange={event => update({ location: event.target.value })} placeholder="Borrowdale, Harare" /></label>
          <label>Manager<select value={form.managerUserId} onChange={event => update({ managerUserId: event.target.value })}><option value="">No manager yet</option>{members.map(member => <option value={member.userId} key={member.userId}>{member.email}</option>)}</select></label>
          <label>Phone<input type="tel" value={form.phone} onChange={event => update({ phone: event.target.value })} placeholder="+263..." /></label>
          <label>WhatsApp<input type="tel" value={form.whatsapp} onChange={event => update({ whatsapp: event.target.value })} placeholder="+263..." /></label>
          <label className="wide">Email<input type="email" value={form.email} onChange={event => update({ email: event.target.value })} placeholder="branch@agency.co.zw" /></label>
          <label className="wide">Street address<input value={form.address} onChange={event => update({ address: event.target.value })} placeholder="Office address clients can visit" /></label>
          <label className="wide">Opening hours<input value={form.openingHours} onChange={event => update({ openingHours: event.target.value })} placeholder="Mon-Fri, 8:30-17:00" /></label>
          <label className="wide">Public description<textarea value={form.description} onChange={event => update({ description: event.target.value })} placeholder="What this branch handles and the areas it serves." /></label>
          <label className="branch-toggle"><input type="checkbox" checked={form.publicEnabled} onChange={event => update({ publicEnabled: event.target.checked })} /> Show this office on the public website</label>
        </div>
        <button className="branch-primary" disabled={busy || (mode === "create" && remaining === 0)}>{busy ? "Saving..." : mode === "create" ? "Create branch" : "Save branch"}</button>
        {message && <p role="status" className="branch-message">{message}</p>}
      </form>
      {selected && <aside className="branch-detail">
        <div className="branch-detail-title"><span>{isActive(selected) ? "ACTIVE OFFICE" : "ARCHIVED OFFICE"}</span><h2>{selected.name}</h2><p>{selected.description || "Add a public description so clients understand what this office handles."}</p></div>
        <div className="branch-contact-grid">
          <span><b>Manager</b>{selected.managerEmail || "Not assigned"}</span><span><b>Phone</b>{selected.phone || "Not set"}</span><span><b>WhatsApp</b>{selected.whatsapp || "Uses agency default"}</span><span><b>Email</b>{selected.email || "Uses agency default"}</span><span><b>Hours</b>{selected.openingHours || "Not set"}</span><span><b>Website</b>{isPublic(selected) ? "Visible" : "Hidden"}</span>
        </div>
        <section className="branch-assignment-panel">
          <div className="branch-section-head"><span>TEAM SCOPE</span></div>
          <select aria-label={`Assign a member to ${selected.name}`} defaultValue="" onChange={event => { if (event.target.value) assignMember(event.target.value, true); event.target.value = ""; }}><option value="">Choose member...</option>{members.map(member => <option value={member.userId} key={member.userId}>{member.email}</option>)}</select>
          <div className="branch-chip-list">{assignedTeam.map(item => <button key={item.userId} onClick={() => assignMember(item.userId, false)}>Remove {item.email}</button>)}{!assignedTeam.length && <small>No branch-scoped members yet.</small>}</div>
        </section>
        <section className="branch-assignment-panel">
          <div className="branch-section-head"><span>LISTINGS OWNED HERE</span><button type="button" onClick={saveProperties} disabled={busy}>Save listings</button></div>
          <div className="branch-property-list">{assignableProperties.map(property => <label key={property.id}><input type="checkbox" checked={selectedProperties.includes(property.id)} onChange={() => toggleProperty(property.id)} /><span><b>{property.title}</b><small>{property.ref} / {property.status}</small></span></label>)}{!properties.length && <small>No properties in this workspace yet.</small>}</div>
        </section>
        <div className="branch-danger-zone"><button onClick={() => toggle(selected)} disabled={busy}>{isActive(selected) ? "Archive branch" : "Reactivate branch"}</button><button onClick={() => remove(selected)} disabled={busy || Number(selected.properties || 0) > 0}>Delete empty branch</button></div>
      </aside>}
    </section>
  </main>;
}
