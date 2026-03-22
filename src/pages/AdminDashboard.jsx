import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    todayPending: 0,
    last7: { pending: 0, in_progress: 0, completed: 0 },
    newUsersThisWeek: 0,
    recentPending: [],
    todayScheduled: []
  });

  useEffect(() => {
    const run = async () => {
      setError('');
      setLoading(true);
      try {
        const today = new Date();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const startUTC = new Date(startOfDay.getTime() - (5.5 * 60 * 60 * 1000));
        const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) throw new Error('Not authenticated');

        const { data: todayData, error: todayErr } = await supabase
          .from('consultations')
          .select('id, status, created_at')
          .gte('created_at', startOfDay.toISOString());
        if (todayErr) throw todayErr;

        const { data: last7Data, error: last7Err } = await supabase
          .from('consultations')
          .select('id, status, created_at')
          .gte('created_at', sevenDaysAgo.toISOString());
        if (last7Err) throw last7Err;

        const { data: usersData, error: usersErr } = await supabase
          .from('profiles')
          .select('id, created_at')
          .gte('created_at', sevenDaysAgo.toISOString());
        if (usersErr && usersErr.code !== '42P01') {
          throw usersErr;
        }

        const { data: recentPending, error: recentErr } = await supabase
          .from('consultations')
          .select('id, name, created_at, status')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5);
        if (recentErr) throw recentErr;

        const todayPending = (todayData || []).filter((c) => (c.status || '').toLowerCase() === 'active').length;
        const agg = { pending: 0, in_progress: 0, completed: 0 };
        (last7Data || []).forEach((c) => {
          const s = String(c.status || '').toLowerCase();
          if (s === 'active') agg.pending += 1;
          else if (s === 'slot_selected') agg.in_progress += 1;
          else if (s === 'completed') agg.completed += 1;
        });

        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: todayScheduled, error: schedErr } = await supabase
          .from('consultations')
          .select('id, name, scheduled_slot, google_meet_link')
          .eq('status', 'slot_selected')
          .gte('scheduled_slot', startUTC.toISOString())
          .lte('scheduled_slot', endUTC.toISOString())
          .order('scheduled_slot', { ascending: true });

        if (schedErr) throw schedErr;
        console.log('todayScheduled:', todayScheduled);
        setStats({
          todayPending,
          last7: agg,
          newUsersThisWeek: (usersData || []).length,
          recentPending: recentPending || [],
          todayScheduled: todayScheduled || []
        });
      } catch (e) {
        setError(e.message || 'Failed to load stats.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, 10000);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-vedic-brown mb-2">Admin dashboard</h1>
        <p className="text-vedic-brown/70 text-sm">
          Overview of consultations, users, and items that need attention.
        </p>
      </div>

      {error && (
        <div className="glass-panel rounded-lg px-4 py-3 text-sm text-red-800 bg-red-50 border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Pending today" value={stats.todayPending} />
        <StatCard
          label="Last 7 days"
          value={`${stats.last7.pending} pending / ${stats.last7.in_progress} in progress / ${stats.last7.completed} completed`}
        />
        <StatCard label="New users this week" value={stats.newUsersThisWeek} />
      </div>

      <div className="glass-panel rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-vedic-brown/60">Needs attention</div>
            <div className="text-sm text-vedic-brown/70">
              Last 5 pending consultations
            </div>
          </div>
        </div>
        {loading ? (
          <div className="text-sm text-vedic-brown/70">Loading…</div>
        ) : stats.recentPending.length === 0 ? (
          <div className="text-sm text-vedic-brown/70">Nothing pending right now.</div>
        ) : (
          <ul className="divide-y divide-vedic-brown/10">
            {stats.recentPending.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-vedic-brown">{c.name}</div>
                  <div className="text-xs text-vedic-brown/60">
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                </div>
                <a
                  href={`/admin/consultations/${c.id}`}
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-vedic-cosmic hover:underline"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="glass-panel rounded-lg p-6">
  <div className="flex items-center justify-between mb-4">
    <div>
      <div className="text-xs uppercase tracking-[0.2em] text-vedic-brown/60">
        Today's sessions
      </div>
      <div className="text-sm text-vedic-brown/70">
        Consultations scheduled for today
      </div>
    </div>
  </div>

  {loading ? (
    <div className="text-sm text-vedic-brown/70">Loading…</div>
  ) : stats.todayScheduled.length === 0 ? (
    <div className="text-sm text-vedic-brown/70">No sessions scheduled today.</div>
  ) : (
    <ul className="divide-y divide-vedic-brown/10">
      {stats.todayScheduled.map((c) => (
        <li key={c.id} className="py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-vedic-brown">
              {c.name}
            </div>

            <div className="text-xs text-vedic-brown/60">
              🕒 {new Date(c.scheduled_slot).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </div>

            {c.google_meet_link && (
              <a
                href={c.google_meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-vedic-cosmic underline"
              >
                Join Meet
              </a>
            )}
          </div>

          <a
            href={`/admin/consultations/${c.id}`}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-vedic-cosmic hover:underline"
          >
            View
          </a>
        </li>
      ))}
    </ul>
  )}
</div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
        {label}
      </div>
      <div className="text-lg font-semibold text-vedic-brown">{value}</div>
    </div>
  );
}

