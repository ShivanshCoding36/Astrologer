import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const STATUS_OPTIONS = [
  'all',
  'active',
  'completed',
  'slot_selected',
  'cancelled'
];

export default function ConsultationsListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [status, setStatus] = useState('slot_selected');
  const [emailFilter, setEmailFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    let interval;
    const run = async () => {
      setErrorMsg('');
      setLoading(true);
      let query = supabase.from('consultations').select('*').order('created_at', { ascending: false });
      console.log('a');
      console.log(query);
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      if (from) {
        query = query.gte('scheduled_slot', new Date(from).toISOString());
      }
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query = query.lte('scheduled_slot', end.toISOString());
      }
      if (emailFilter.trim()) {
        query = query.ilike('user_email', `%${emailFilter.trim()}%`);
      }

      const { data, error } = await query;
      console.log('data', data);
      console.log('error', error);
      setLoading(false);
      if (error) {
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
  }, [status, from, to, emailFilter]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-vedic-brown mb-2">Consultations</h1>
        <p className="text-sm text-vedic-brown/70">
          Review, filter, and manage all consultations.
        </p>
      </div>

      {errorMsg ? (
        <div className="glass-panel rounded-lg px-4 py-3 text-sm text-red-800 bg-red-50 border-red-200">
          {errorMsg}
        </div>
      ) : null}

      <div className="glass-panel rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-vedic-brown/10 bg-white/80 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-md border border-vedic-brown/10 bg-white/80 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-md border border-vedic-brown/10 bg-white/80 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
            User email
          </label>
          <input
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            className="w-full rounded-md border border-vedic-brown/10 bg-white/80 px-3 py-2 text-sm"
            placeholder="Filter by email (requires user_email column)"
          />
        </div>
      </div>

      <div className="glass-panel rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-vedic-cream">
            <tr>
              <Th>User</Th>
              <Th>Created</Th>
              <Th>Topics</Th>
              <Th>Session Time (if today)</Th>
              <Th>Status</Th>
              <Th>Amount</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-vedic-brown/70">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-vedic-brown/70">
                  No consultations match these filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-vedic-brown/10">
                  <Td>
                    <div className="font-medium text-vedic-brown">{r.name}</div>
                    <div className="text-xs text-vedic-brown/60">{r.user_email || r.user_id}</div>
                  </Td>
                  <Td>{new Date(r.created_at).toLocaleString()}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {(r.topics || []).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full bg-white border border-vedic-brown/10 text-xs text-vedic-brown/80"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </Td>

                  <Td>
                    {r.scheduled_slot ? 
                      new Date(r.scheduled_slot).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      }) 
                      : 'N/A'
                    }
                  </Td>
                  <Td>
                    <span className="px-2 py-1 rounded-full border border-vedic-brown/15 text-xs uppercase tracking-wide">
                      {r.status}
                    </span>
                  </Td>
                  <Td>₹{r.amount_inr}</Td>
                  <Td>
                    <Link
                      to={`/admin/consultations/${r.id}`}
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-vedic-cosmic hover:underline"
                    >
                      View
                    </Link>
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

