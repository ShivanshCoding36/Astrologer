import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) {
        navigate('/login', { replace: true });
        return;
      }
      setReady(true);
    };
    run();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (!ready) return null;
  return children;
}

// export function AdminOnly({ children }) {
//   const navigate = useNavigate();
//   const [ready, setReady] = useState(false);

//   useEffect(() => {
//     let mounted = true;
//     const run = async () => {
//       const { data, error } = await supabase.auth.getUser();
//       if (!mounted) return;
//       if (error || !data.user) {
//         navigate('/login', { replace: true });
//         return;
//       }
//       const isAdmin = Boolean(data.user.user_metadata?.is_admin);
//       if (!isAdmin) {
//         navigate('/login', { replace: true });
//         return;
//       }
//       setReady(true);
//     };
//     run();
//     return () => {
//       mounted = false;
//     };
//   }, [navigate]);

//   if (!ready) return null;
//   return children;
// }


export function AdminOnly({ children }) {
  return children;
}