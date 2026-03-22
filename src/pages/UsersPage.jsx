import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function UsersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailFilter, setEmailFilter] = useState('');

  useEffect(() => {
    let interval;
    const run = async () => {
      setErrorMsg('');
      setLoading(true);
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (emailFilter.trim()) {
        query = query.ilike('email', `%${emailFilter.trim()}%`);
      }
      const { data, error } = await query;
      setLoading(false);
      if (error) {
        console.log('error2', error);
        setErrorMsg(error.message);
        setRows([]);
        return;
      }
      setRows(data || []);
    };
    run();
    interval = setInterval(() => {
      run();
    }, 10000);
  
    return () => clearInterval(interval);
  }, [emailFilter]);

  const toggleFlag = async (userId, field) => {
    const row = rows.find((r) => r.id === userId);
    if (!row) return;
    const nextVal = !row[field];
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: nextVal })
      .eq('id', userId);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === userId ? { ...r, [field]: nextVal } : r))
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-vedic-brown mb-2">Users</h1>
        <p className="text-sm text-vedic-brown/70">
          Lightweight view over your Supabase profiles table. Use this to mark VIPs, block booking,
          or grant admin access.
        </p>
      </div>

      {errorMsg ? (
        <div className="glass-panel rounded-lg px-4 py-3 text-sm text-red-800 bg-red-50 border-red-200">
          {errorMsg}
        </div>
      ) : null}

      <div className="glass-panel rounded-lg p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
            Email
          </label>
          <input
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            className="rounded-md border border-vedic-brown/10 bg-white/80 px-3 py-2 text-sm"
            placeholder="Search by email"
          />
        </div>
        <p className="text-xs text-vedic-brown/60">
          This expects a <code>profiles</code> table with <code>id, email, name, is_vip, blocked, is_admin, consultations_count</code>.
        </p>
      </div>

      <div className="glass-panel rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-vedic-cream">
            <tr>
              <Th>Email</Th>
              <Th>Name</Th>
              <Th>Created</Th>
              <Th>Consultations</Th>
              <Th>Flags</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-vedic-brown/70">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-vedic-brown/70">
                  No users found.
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-t border-vedic-brown/10">
                  <Td>
                    <div className="font-medium text-vedic-brown">{u.email}</div>
                    <div className="text-xs text-vedic-brown/60">{u.id}</div>
                  </Td>
                  <Td>{u.name}</Td>
                  <Td>{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</Td>
                  <Td>{u.consultations_count ?? '—'}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {u.is_vip && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          VIP
                        </span>
                      )}
                      {u.blocked && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          Blocked
                        </span>
                      )}
                      {u.is_admin && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Admin
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      
                      <FlagButton
                        active={u.blocked}
                        label="Block"
                        onClick={() => toggleFlag(u.id, 'blocked')}
                      />
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-vedic-brown/60">
      {children}
    </th>
  );
}

function Td({ children }) {
  return <td className="px-4 py-3 align-top text-vedic-brown/80">{children}</td>;
}

function FlagButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-1 rounded-full border text-[11px]',
        active
          ? 'bg-vedic-brown text-white border-vedic-brown'
          : 'bg-white/80 text-vedic-brown border-vedic-brown/20 hover:bg-vedic-brown/5'
      ].join(' ')}
    >
      {label}
    </button>
  );
}

