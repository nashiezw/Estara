"use client";
import { useState, useEffect } from "react";

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);

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
      <b>SN</b>
      <span>
        <strong>Sarah Ncube</strong>
        <small>Principal</small>
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
          <button onClick={() => { window.location.href = "/signout-with-chatgpt" }}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
