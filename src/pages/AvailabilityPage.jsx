import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const STATUS_COLORS = {
  available: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  pendingAstroApproval: 'bg-amber-100 text-amber-800 border-amber-200',
  booked: 'bg-sky-100 text-sky-800 border-sky-200',
};

export default function AvailabilityPage() {
  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [weeks, setWeeks] = useState(3);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [createForm, setCreateForm] = useState({
    date: '',
    startTime: '14:00',
    endTime: '18:00',
    repeat: 'none', // none | weekdays | custom
    weeksCount: 4,
    daysOfWeek: ['1', '2', '3', '4', '5'] // 0=Sun..6=Sat
  });

  const fromTo = useMemo(() => {
    const from = new Date(rangeStart);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + weeks * 7);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }, [rangeStart, weeks]);

  useEffect(() => {
    let interval;
    
    const run = async () => {
      setErrorMsg('');
      setLoading(true);
      const { from, to } = fromTo;
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .gte('start_at', from.toISOString())
        .lte('start_at', to.toISOString())
        .order('start_at', { ascending: true });
      setLoading(false);
      if (error) {
        setErrorMsg(error.message);
        setSlots([]);
        return;
      }
      setSlots(data || []);
    };
    run();

    interval = setInterval(() => {
      run();
    }, 10000);
  
    return () => clearInterval(interval);
  }, [fromTo],10000);

  const slotsByDay = useMemo(() => {
    const map = new Map();
    slots.forEach((s) => {
      const d = new Date(s.start_at);
      const key = d.toISOString().slice(0, 10);
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    });
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [slots]);

  const toggleSelected = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const bulkUpdateStatus = async (status) => {
    if (!selectedIds.length) return;
    setErrorMsg('');
    const { error } = await supabase
      .from('availability_slots')
      .update({ status })
      .in('id', selectedIds);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setSlots((prev) =>
      prev.map((s) =>
        selectedIds.includes(s.id)
          ? { ...s, status }
          : s
      )
    );
    setSelectedIds([]);
  };
  const bulkDeleteSlots = async () => {
    if (!selectedIds.length) return;
    setErrorMsg('');
  
    const { error } = await supabase
      .from('availability_slots')
      .delete()
      .in('id', selectedIds);
  
    if (error) {
      setErrorMsg(error.message);
      return;
    }
  
    // Remove deleted slots from UI
    setSlots((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
    setSelectedIds([]);
  };

  const createSlots = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const { date, startTime, endTime, repeat, weeksCount, daysOfWeek } = createForm;
    if (!date || !startTime || !endTime) {
      setErrorMsg('Please choose date, start time and end time.');
      return;
    }

    const baseDate = new Date(date + 'T00:00:00');
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    if (endMinutes <= startMinutes) {
      setErrorMsg('End time must be after start time.');
      return;
    }

    const rows = [];
    const totalWeeks = repeat === 'none' ? 1 : weeksCount;

    for (let w = 0; w < totalWeeks; w += 1) {
      const weekStart = new Date(baseDate);
      weekStart.setDate(weekStart.getDate() + w * 7);

      const dows = repeat === 'custom' ? daysOfWeek : repeat === 'weekdays' ? ['1', '2', '3', '4', '5'] : [String(weekStart.getDay())];

      dows.forEach((dowStr) => {
        const dow = Number(dowStr);
        const current = new Date(weekStart);
        const diff = dow - current.getDay();
        current.setDate(current.getDate() + diff);

        for (let m = startMinutes; m < endMinutes; m += 60) {
          const start = new Date(current);
          start.setHours(0, 0, 0, 0);
          start.setMinutes(m);
          const end = new Date(start);
          end.setHours(start.getHours() + 1);
          rows.push({
            start_at: start.toISOString(),
            end_at: end.toISOString(),
            status: 'available'
          });
        }
      });
    }

    if (!rows.length) return;

    const { error } = await supabase.from('availability_slots').insert(rows);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setCreateForm((prev) => ({ ...prev, date: '' }));
    const { from, to } = fromTo;
    const { data, error: refetchErr } = await supabase
      .from('availability_slots')
      .select('*')
      .gte('start_at', from.toISOString())
      .lte('start_at', to.toISOString())
      .order('start_at', { ascending: true });
    if (refetchErr) {
      setErrorMsg(refetchErr.message);
      return;
    }
    setSlots(data || []);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-vedic-brown mb-2">Availability</h1>
        <p className="text-sm text-vedic-brown/70">
          Manage your one-hour consultation slots without touching Supabase directly.
        </p>
      </div>

      {errorMsg ? (
        <div className="glass-panel rounded-lg px-4 py-3 text-sm text-red-800 bg-red-50 border-red-200">
          {errorMsg}
        </div>
      ) : null}

      <div className="glass-panel rounded-lg p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
            Start date
          </label>
          <input
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className="rounded-md border border-vedic-brown/10 bg-white/80 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
            Weeks visible
          </label>
          <select
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="rounded-md border border-vedic-brown/10 bg-white/80 px-3 py-2 text-sm"
          >
            <option value={2}>2 weeks</option>
            <option value={3}>3 weeks</option>
            <option value={4}>4 weeks</option>
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            disabled={!selectedIds.length}
            onClick={() => bulkUpdateStatus('available')}
            className="px-4 py-2 text-xs rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 disabled:opacity-40"
          >
            Mark available
          </button>
          <button
            type="button"
            disabled={!selectedIds.length}
            onClick={bulkDeleteSlots}
            className="px-4 py-2 text-xs rounded-md border border-slate-200 bg-slate-50 text-slate-800 disabled:opacity-40"
          >
            Delete slots
          </button>
        </div>
      </div>

      <form onSubmit={createSlots} className="glass-panel rounded-lg p-4 space-y-3">
        <div className="text-xs uppercase tracking-[0.2em] text-vedic-brown/60">
          Add repeating availability
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
              Base date
            </label>
            <input
              type="date"
              value={createForm.date}
              onChange={(e) => setCreateForm((p) => ({ ...p, date: e.target.value }))}
              className="w-full rounded-md border border-vedic-brown/10 bg-white/80 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
              From
            </label>
            <input
              type="time"
              value={createForm.startTime}
              onChange={(e) => setCreateForm((p) => ({ ...p, startTime: e.target.value }))}
              className="w-full rounded-md border border-vedic-brown/10 bg-white/80 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
              To
            </label>
            <input
              type="time"
              value={createForm.endTime}
              onChange={(e) => setCreateForm((p) => ({ ...p, endTime: e.target.value }))}
              className="w-full rounded-md border border-vedic-brown/10 bg-white/80 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
              Repeat
            </label>
            <select
              value={createForm.repeat}
              onChange={(e) => setCreateForm((p) => ({ ...p, repeat: e.target.value }))}
              className="w-full rounded-md border border-vedic-brown/10 bg-white/80 px-3 py-2 text-sm"
            >
              <option value="none">Just this date</option>
              <option value="weekdays">Mon–Fri for N weeks</option>
              <option value="custom">Custom days for N weeks</option>
            </select>
          </div>
        </div>

        {createForm.repeat !== 'none' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
                Weeks
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={createForm.weeksCount}
                onChange={(e) => setCreateForm((p) => ({ ...p, weeksCount: Number(e.target.value) }))}
                className="w-full rounded-md border border-vedic-brown/10 bg-white/80 px-3 py-2 text-sm"
              />
            </div>
            {createForm.repeat === 'custom' && (
              <div className="md:col-span-3">
                <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
                  Days of week
                </label>
                <div className="flex flex-wrap gap-2 text-xs">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, idx) => {
                    const active = createForm.daysOfWeek.includes(String(idx));
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() =>
                          setCreateForm((p) => ({
                            ...p,
                            daysOfWeek: active
                              ? p.daysOfWeek.filter((d) => d !== String(idx))
                              : [...p.daysOfWeek, String(idx)]
                          }))
                        }
                        className={[
                          'px-3 py-1 rounded-full border',
                          active
                            ? 'bg-vedic-brown text-white border-vedic-brown'
                            : 'bg-white text-vedic-brown border-vedic-brown/20'
                        ].join(' ')}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          className="mt-2 inline-flex px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] rounded-md bg-vedic-brown text-white hover:bg-vedic-cosmic"
        >
          Add slots
        </button>
      </form>

      <div className="glass-panel rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-[0.2em] text-vedic-brown/60">
            Slots in view
          </div>
          {loading && <div className="text-xs text-vedic-brown/60">Loading…</div>}
        </div>
        {slotsByDay.length === 0 ? (
          <div className="text-sm text-vedic-brown/70">
            No slots in this range. Add slots above.
          </div>
        ) : (
          <div className="space-y-4">
            {slotsByDay.map(([day, daySlots]) => (
              <div key={day} className="border border-vedic-brown/10 rounded-md p-3 bg-white/70">
                <div className="text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-2">
                  {new Date(day).toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((s) => {
                    const start = new Date(s.start_at);
                    const end = new Date(s.end_at);
                    const label = `${start.toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit'
                    })} – ${end.toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}`;
                    const selected = selectedIds.includes(s.id);
                    const statusClass = STATUS_COLORS[s.status] || STATUS_COLORS.available;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSelected(s.id)}
                        className={[
                          'px-3 py-2 rounded-md border text-xs font-medium transition-colors',
                          statusClass,
                          selected ? 'ring-2 ring-vedic-cosmic' : ''
                        ].join(' ')}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function parseTimeToMinutes(value) {
  const [h, m] = value.split(':').map((x) => Number(x));
  return h * 60 + m;
}

