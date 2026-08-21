"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type LinkItem = { label: string; href: string };

export default function HomeMobileDrawer({ links, loginHref, registerHref }: { links: LinkItem[]; loginHref: string; registerHref: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const drawer = (
    <div className={`home-mobile-drawer ${open ? "open" : ""}`}>
      <button className="home-drawer-overlay" type="button" aria-label="Close menu" tabIndex={open ? 0 : -1} onClick={close} />
      <aside id="home-mobile-navigation" aria-hidden={!open}>
        <header>
          <strong>ESTARA</strong>
          <button type="button" aria-label="Close menu" onClick={close}>
            ×
          </button>
        </header>
        <nav aria-label="Mobile navigation">
          {links.map((link) => (
            <a href={link.href} onClick={close} key={link.label}>
              {link.label}
            </a>
          ))}
          <a href="/demo" onClick={close}>
            View demo
          </a>
        </nav>
        <footer>
          <a href={loginHref} onClick={close}>
            Log in
          </a>
          <a href={registerHref} onClick={close}>
            Create account
          </a>
        </footer>
      </aside>
    </div>
  );

  return (
    <div className="home-mobile-drawer">
      <button className="home-menu-button" type="button" aria-expanded={open} aria-controls="home-mobile-navigation" onClick={() => setOpen(true)}>
        Menu
      </button>
      {mounted ? createPortal(drawer, document.body) : null}
    </div>
  );
}
