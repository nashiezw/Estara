"use client";
import { useState, useEffect } from "react";

type UserMenuProps = {
  user?: {
    displayName?: string;
    email?: string;
    role?: string;
  } | null;
};

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "U";

const roleLabel = (role?: string) =>
  role ? role.replace(/[_-]/g, " ").replace(/\b\w/g, char => char.toUpperCase()) : "Team member";

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const displayName = user?.displayName || user?.email || "Signed-in user";
  const subtitle = user?.role ? roleLabel(user.role) : user?.email || "Workspace access";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !(event.target as Element).closest(".user")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="user">
      <b>{initials(displayName)}</b>
      <span>
        <strong>{displayName}</strong>
        <small>{subtitle}</small>
      </span>
      <button 
        className="user-menu-trigger" 
        onClick={() => setIsOpen(!isOpen)} 
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        •••
      </button>
      {isOpen && (
        <div className="user-menu">
          {user?.email && <small>{user.email}</small>}
          <button onClick={signOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };
