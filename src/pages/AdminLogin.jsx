import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
  
    // 1. Sign in user
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    console.log('logined');
    if (error) {
      console.log('loginwed');
      setLoading(false);
      setErrorMsg(error.message);
      return;
    }
  
    // 2. Get logged-in user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    console.log('lddoginwed');
    if (userErr || !userData?.user) {
      await supabase.auth.signOut();
      setLoading(false);
      setErrorMsg('Something went wrong. Please try again.');
      console.log('error1', error);
      return;
    }
    console.log('logined2');
    console.log(userData.user.id)


    // 3. Check admins table (THIS IS THE KEY CHANGE)
    const { data: admin, error: adminErr } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userData.user.id)
      .single(); 
      console.log('admin', admin);
    if (adminErr || !admin) {
      console.log('adminErr', adminErr);
      await supabase.auth.signOut();
      setLoading(false);
      setErrorMsg('You are not allowed to access the admin console.');
      return;
    }
  
    // ✅ Admin verified
    setLoading(false);
    navigate('/admin', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-serif text-vedic-brown mb-2 text-center">Astro Shipra Admin</h1>
        Sign in with an account that has admin access.

        {errorMsg ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMsg}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-2">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-vedic-brown/10 bg-white/70 px-4 py-3 outline-none focus:ring-0"
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-vedic-brown/60 mb-2">
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-vedic-brown/10 bg-white/70 px-4 py-3 outline-none focus:ring-0"
              type="password"
              placeholder="Your password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-10 py-3 bg-vedic-brown text-white rounded-sm text-sm font-semibold hover:bg-vedic-cosmic transition-colors uppercase tracking-wide disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

