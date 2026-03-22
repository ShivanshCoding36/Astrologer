import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const STATUS_ORDER = ['pending', 'slot_selected', 'in_progress', 'completed', 'cancelled'];

export default function ConsultationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [slotMap, setSlotMap] = useState({});
  const [form, setForm] = useState({
    scheduled_slot: '',
    selected_slot_id: '',
    google_meet_link: '',
  });

  useEffect(() => {
    const run = async () => {
      setErrorMsg('');
      setLoading(true);
  
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('id', id)
        .single();
  
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }
  
      setRow(data);
      setForm({
        scheduled_slot: data.scheduled_slot || '',
        google_meet_link: data.google_meet_link || '',
        admin_notes: data.admin_notes || ''
      });
  
      // 🔥 NEW: fetch slot times using IDs
      if (data?.preferred_slots?.length) {
        const { data: slots, error: slotErr } = await supabase
          .from('availability_slots')
          .select('id, start_at, end_at')
          .in('id', data.preferred_slots);
  
        if (!slotErr && slots) {
          const map = {};
          slots.forEach((s) => {
            map[s.id] = s; // store full slot
          });
          setSlotMap(map);
        }
      }
  
      setLoading(false);
    };
  
    run();
  }, [id]);

  const updateStatus = async (status) => {
    if (!row) return;
    if (status === 'completed') return;
    setSaving(true);
    const { error } = await supabase.from('consultations').update({ status }).eq('id', row.id);
    setSaving(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setRow((prev) => ({ ...prev, status }));
  };

  const handleFinalSave = async () => {
    if (!row) return;
  
    // 🔴 validation
    if (!form.google_meet_link || !form.scheduled_slot || !form.selected_slot_id) {
      setErrorMsg('Please select a slot and enter Google Meet link.');
      return;
    }
  
    setSaving(true);
    setErrorMsg('');
  
    // 1️⃣ Update consultation
    const { error: consultErr } = await supabase
      .from('consultations')
      .update({
        scheduled_slot: form.scheduled_slot,
        google_meet_link: form.google_meet_link,
        status: 'slot_selected'
      })
      .eq('id', row.id);
  
    if (consultErr) {
      setSaving(false);
      setErrorMsg(consultErr.message);
      return;
    }
  
    // 2️⃣ Update slot → booked
    const { error: slotErr } = await supabase
      .from('availability_slots')
      .update({ status: 'booked' })
      .eq('id', form.selected_slot_id)
      .eq('status', 'pendingAstroApproval'); // 🔥 safety check
  
    if (slotErr) {
      setSaving(false);
      setErrorMsg(slotErr.message);
      return;
    }
  
    // 3️⃣ refresh UI
    const { data } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', row.id)
      .single();


    try {
        await fetch('/api/send-confirmation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: row.user_email,
            name: row.name,
            slot: form.scheduled_slot,
            meetLink: form.google_meet_link
          })
        });
      } catch (e) {
        console.error('Email failed', e);
      }
    setRow(data);
    setSaving(false);
  };
  
const handleMarkCompleted = async () => {
  if (!row) return;
  if (status === 'completed') return;
  setSaving(true);
  setErrorMsg('');

  // 1️⃣ update consultation
  const { error: consultErr } = await supabase
    .from('consultations')
    .update({ status: 'completed' })
    .eq('id', row.id);

  if (consultErr) {
    setSaving(false);
    setErrorMsg(consultErr.message);
    return;
  }

  // 2️⃣ increment profile counter
  const { error: profileErr } = await supabase.rpc('increment_consultations_count', {
    user_id_input: row.user_id
  });

  if (profileErr) {
    setSaving(false);
    setErrorMsg(profileErr.message);
    return;
  }

  // 3️⃣ refresh UI
  setRow((prev) => ({ ...prev, status: 'completed' }));
  setSaving(false);
};

  const confirmSlotAndNotify = async (slotIso) => {
    if (!slotIso || !row) return;
    setSaving(true);
    setErrorMsg('');
    const updates = {
      scheduled_slot: slotIso,
      status: 'slot_selected'
    };
    const { error, data } = await supabase
      .from('consultations')
      .update(updates)
      .eq('id', row.id)
      .select('*')
      .single();
    if (error) {
      setSaving(false);
      setErrorMsg(error.message);
      return;
    }

    if (row.preferred_slots && row.preferred_slots.length) {
      const { error: slotErr } = await supabase
        .from('availability_slots')
        .update({ status: 'busy' })
        .in('start_at', [slotIso]);
      if (slotErr) {
        setErrorMsg(slotErr.message);
      }
    }

    try {
      await fetch('/api/admin/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultation_id: row.id
        })
      });
    } catch (_e) {
      // swallow; backend can log
    }

    setSaving(false);
    setRow(data);
    setForm((prev) => ({ ...prev, scheduled_slot: slotIso }));
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <p className="text-sm text-vedic-brown/70">Loading consultation…</p>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="max-w-5xl mx-auto">
        <p className="text-sm text-vedic-brown/70">Consultation not found.</p>
      </div>
    );
  }

  const preferred = Array.isArray(row.preferred_slots) ? row.preferred_slots : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate('/admin/consultations')}
        className="text-xs text-vedic-brown/70 underline"
      >
        Back to list
      </button>

      <div>
        <h1 className="text-3xl font-serif text-vedic-brown mb-1">Consultation detail</h1>
        <p className="text-sm text-vedic-brown/70">
          Manage slot, status, meeting link, and internal notes.
        </p>
      </div>

      {errorMsg ? (
        <div className="glass-panel rounded-lg px-4 py-3 text-sm text-red-800 bg-red-50 border-red-200">
          {errorMsg}
        </div>
      ) : null}

      <div className="glass-panel rounded-lg p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
              User
            </div>
            <div className="text-lg font-semibold text-vedic-brown">{row.name}</div>
            <div className="text-xs text-vedic-brown/60">{row.user_email || row.user_id}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
              Status
            </div>
            <div className="inline-flex gap-2 items-center">
              <span className="px-3 py-1 text-xs rounded-full border border-vedic-brown/15 uppercase tracking-wide">
                {row.status}
              </span>
              
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-vedic-brown/80">
          <Field label="DOB">{row.date_of_birth}</Field>
          <Field label="TOB">{row.time_of_birth}</Field>
          <Field label="POB">{row.place_of_birth}</Field>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
            Topics
          </div>
          <div className="flex flex-wrap gap-2">
            {(row.topics || []).map((t) => (
              <span
                key={t}
                className="px-3 py-1 rounded-full bg-white border border-vedic-brown/10 text-xs text-vedic-brown/80"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
            Queries
          </div>
          <p className="text-sm text-vedic-brown/80 whitespace-pre-wrap leading-relaxed">
            {row.queries}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-vedic-brown/80">
          <Field label="Amount">₹{row.amount_inr}</Field>
          <Field label="Razorpay order">{row.razorpay_order_id || '—'}</Field>
          <Field label="Razorpay payment">{row.razorpay_payment_id || '—'}</Field>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-lg p-6 space-y-3">
          <div className="text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
            Preferred slots
          </div>
          {preferred.length === 0 ? (
            <p className="text-sm text-vedic-brown/70">No preferred slots recorded.</p>
          ) : (
            <div className="space-y-2">
              {preferred.map((slotId) => {
    const slot = slotMap[slotId];

          return (
            <button
              key={slotId}
              type="button"
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  scheduled_slot: slot?.start_at,
                  selected_slot_id: slotId
                }));
              }}
              className={[
                'w-full flex items-center justify-between px-3 py-2 rounded-md border text-xs',
                form.scheduled_slot === slot?.start_at
                  ? 'bg-vedic-brown text-white border-vedic-brown'
                  : 'bg-white/80 text-vedic-brown border-vedic-brown/10 hover:bg-vedic-brown/5'
              ].join(' ')}
              disabled={saving}
            >
              <span>
                {slot
                  ? formatSlotFromUTC(slot.start_at)
                  : 'Loading...'}
              </span>

              <span className="uppercase tracking-[0.2em]">
                {form.scheduled_slot === slot?.start_at ? 'Selected' : 'Select'}
              </span>
            </button>
          );
      })}   
            </div>
          )}

          <div className="mt-4">
            <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
              Scheduled slot (ISO)
            </label>
            <input
              value={form.scheduled_slot}
              onChange={(e) => setForm((p) => ({ ...p, scheduled_slot: e.target.value }))}
              className="w-full rounded-md border border-vedic-brown/10 bg-white/80 px-3 py-2 text-xs"
              placeholder="Override with custom ISO date-time if needed"
            />
          </div>
        </div>

        <div className="glass-panel rounded-lg p-6 space-y-3">
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-1">
              Google Meet link
            </label>
            <input
              value={form.google_meet_link}
              onChange={(e) => setForm((p) => ({ ...p, google_meet_link: e.target.value }))}
              className="w-full rounded-md border border-vedic-brown/10 bg-white/80 px-3 py-2 text-sm"
              placeholder="https://meet.google.com/..."
            />
          </div>
          
          <div className="flex gap-3">
            
            <button
              type="button"
              onClick={handleMarkCompleted}
              disabled={saving}
              className="px-6 py-2 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold uppercase tracking-[0.2em] disabled:opacity-60"
            >
              Mark completed
            </button>
            <button
              type="button"
              onClick={() => updateStatus('cancelled')}
              disabled={saving}
              className="px-6 py-2 rounded-md border border-rose-300 bg-rose-50 text-rose-800 text-xs font-semibold uppercase tracking-[0.2em] disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
        <div className="flex justify-end mt-6">
  <button
    type="button"
    onClick={handleFinalSave}
    disabled={saving}
    className="px-8 py-3 rounded-md bg-vedic-cosmic text-white text-sm font-semibold uppercase tracking-[0.2em] disabled:opacity-60"
  >
    Save & Confirm Slot
  </button>

  
</div>

      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="rounded-md border border-vedic-brown/10 bg-white/70 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-vedic-brown/50 mb-1">
        {label}
      </div>
      <div className="text-sm text-vedic-brown/80 break-all">{children || '—'}</div>
    </div>
  );
}
function formatSlotFromUTC(utcString) {
  const d = new Date(utcString);

  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', // astrologer local time
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
