import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { LuCalendarDays, LuUsers, LuSettings, LuZap, LuStar, LuSparkles } from 'react-icons/lu';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AdminLayout() {
  const navigate = useNavigate();

  function logout(){
    supabase.auth.signOut()
    navigate('/login');

  }
  return (
    <div className="min-h-screen flex bg-vedic-paper">
      <aside className="w-72 border-r border-vedic-brown/10 bg-vedic-cream/90 backdrop-blur-md px-4 py-6 flex flex-col gap-6">
        <Link to="/admin" className="flex items-center gap-3 px-2">
          <div className="h-10 w-10 rounded-full bg-vedic-brown text-vedic-cream flex items-center justify-center">
            <LuStar />
          </div>
          <div>
            <div className="text-sm font-semibold text-vedic-brown">Astro Shipra</div>
            <div className="text-xs text-vedic-brown/60">Admin console</div>
          </div>
        </Link>

        <nav className="flex-1 flex flex-col gap-1 text-sm">
          <div className="flex-1 flex flex-col gap-1 text-sm">
          <SidebarLink to="/admin" end icon={LuZap}>
            Dashboard
          </SidebarLink>
          <SidebarLink to="/admin/availability" icon={LuCalendarDays}>
            Availability
          </SidebarLink>
          <SidebarLink to="/admin/consultations" icon={LuSparkles}>
            Consultations
          </SidebarLink>
          <SidebarLink to="/admin/users" icon={LuUsers}>
            Users
          </SidebarLink>
          </div>

          <div>
            <button onClick={logout}>
              Logout
            </button>
          </div>
        </nav>

        <div className="text-xs text-vedic-brown/50 px-2">
          Signed in as <span className="font-semibold">Admin</span>
        </div>
      </aside>

      <main className="flex-1 px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function SidebarLink({ to, end, icon: Icon, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-md px-3 py-2 font-medium transition-colors',
          isActive ? 'bg-vedic-brown text-white' : 'text-vedic-brown/80 hover:bg-vedic-brown/5'
        ].join(' ')
      }
    >
      <Icon size={18} />
      <span>{children}</span>
    </NavLink>
  );
}

