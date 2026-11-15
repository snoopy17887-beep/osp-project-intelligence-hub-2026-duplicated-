
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import Dashboard from "./App";

export default function AuthGate() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading your account...</p>
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={() => {}} />;
  }

  return <Dashboard />;
}
