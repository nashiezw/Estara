"use client";

import { useEffect, useState } from "react";
import type { PlatformBrand } from "../components/PlatformToolHeader";

export default function SearchClient({ platform }: { platform: PlatformBrand }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setItems([]);
        return;
      }
      setBusy(true);
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const body = await response.json();
      setItems(body.results || []);
      setBusy(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return <>
    <section className="tool-hero">
      <a href="/workspace">Back to workspace</a>
      <span>{platform.shortName} universal search</span>
      <h1>Find anything, instantly.</h1>
      <p>Properties, people, enquiries, actions and private documents - securely limited to your agency.</p>
      <input aria-label="Search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try a name, phone, reference or suburb..." />
    </section>
    <section className="results">
      {busy
        ? <p>Searching...</p>
        : query.length < 2
          ? <p>Type at least two characters to begin.</p>
          : items.length
            ? items.map(item => <a href={item.href} key={`${item.type}-${item.id}`}><i>{item.type.slice(0, 1)}</i><span><small>{item.type}</small><strong>{item.title}</strong><em>{item.detail}</em></span><b>Open</b></a>)
            : <p>No matching records in this agency.</p>}
    </section>
  </>;
}
