"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, LogOut, User, ChevronRight } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = React.useState("");
  const [displayId, setDisplayId] = React.useState("");
  const [isReady, setIsReady] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      window.location.href = "/";
      return;
    }
    
    const name = localStorage.getItem("user_name");
    const id = localStorage.getItem("user_display_id");
    if (name) setUserName(name);
    if (id) setDisplayId(id);
    setIsReady(true);
  }, []);

  if (!isReady) return null; // Prevent flash of content

  const tabs = [
    { href: "/dashboard", label: "الرئيسية", icon: Home },
    { href: "/dashboard/students", label: "بحث الطلاب", icon: Search },
  ];

  return (
    <div className="app-shell">
      {/* ── Status bar area ─────────────────── */}
      <div className="status-bar" />

      {/* ── Top header ──────────────────────── */}
      <header className="app-header">
        <div className="header-inner">
          {/* User greeting */}
          <div className="user-greeting">
            <div className="avatar">
              <User size={20} />
            </div>
            <div>
              <p className="greeting-label">مرحباً،</p>
              <p className="greeting-name">{userName || "جاري التحميل..."}</p>
            </div>
          </div>

          {/* ID + logout */}
          <div className="header-right">
            <div className="id-chip">{displayId}</div>
            <Link href="/" className="logout-btn" onClick={() => localStorage.clear()}>
              <LogOut size={18} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Page content ────────────────────── */}
      <main className="app-content">
        {children}
      </main>

      {/* ── Bottom nav bar ──────────────────── */}
      <nav className="bottom-nav">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`tab-item ${active ? "tab-active" : ""}`}>
              <div className="tab-icon-wrap">
                <Icon size={22} />
                {active && <div className="tab-indicator" />}
              </div>
              <span className="tab-label">{label}</span>
            </Link>
          );
        })}
      </nav>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0d0f1a;
          font-family: 'Segoe UI', 'Cairo', system-ui, sans-serif;
          direction: rtl;
          overflow-x: hidden;
        }

        .app-shell {
          min-height: 100dvh;
          max-width: 480px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          background: #0d0f1a;
          position: relative;
        }

        /* status bar */
        .status-bar {
          height: env(safe-area-inset-top, 0px);
          background: #0d0f1a;
        }

        /* header */
        .app-header {
          padding: 16px 20px 12px;
          background: #0d0f1a;
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .header-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .user-greeting {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6 0%, #6d28d9 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
        }

        .greeting-label {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          margin-bottom: 2px;
        }

        .greeting-name {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .id-chip {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 50px;
          padding: 4px 12px;
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          font-family: monospace;
          letter-spacing: 1px;
        }

        .logout-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f87171;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: rgba(239,68,68,0.2);
        }

        /* main content */
        .app-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px 16px 100px;
          -webkit-overflow-scrolling: touch;
        }

        /* bottom nav */
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 480px;
          height: 72px;
          background: rgba(15,17,26,0.95);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255,255,255,0.07);
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 0 16px;
          padding-bottom: env(safe-area-inset-bottom, 0px);
          z-index: 100;
        }

        .tab-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px 24px;
          border-radius: 16px;
          text-decoration: none;
          transition: all 0.2s;
          position: relative;
        }

        .tab-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tab-indicator {
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #3b82f6;
        }

        .tab-item .tab-label {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.35);
          transition: color 0.2s;
        }

        .tab-item svg {
          color: rgba(255,255,255,0.35);
          transition: all 0.2s;
        }

        .tab-active .tab-label {
          color: #3b82f6 !important;
        }

        .tab-active svg {
          color: #3b82f6 !important;
        }

        .tab-active .tab-icon-wrap {
          background: rgba(59,130,246,0.12);
          border-radius: 12px;
          padding: 6px 12px;
        }

        /* Global card style for pages */
        .mobile-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 20px;
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 0; }
      `}</style>
    </div>
  );
}
