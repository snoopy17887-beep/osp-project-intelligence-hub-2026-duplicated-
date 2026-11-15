
import { useState, type FormEvent } from "react";
import { supabase } from "./supabase";
import {
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Leaf,
  User,
} from "lucide-react";

type LoginProps = {
  onLogin: () => void;
};

type AuthMode = "login" | "signup";

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isSignup = mode === "signup";

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (isSignup) {
        if (!name.trim()) {
          throw new Error("Please enter your full name.");
        }

        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }

        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: name.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          onLogin();
          return;
        }

        if (data.user) {
          setSuccess(
            "Your account has been created successfully! Please verify your email to activate your account."
          );
          setPassword("");
          setConfirmPassword("");
          return;
        }

        throw new Error(
          "Account creation failed. Please try again."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) throw error;

        onLogin();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#080808",
      padding: 24,
      fontFamily: "'DM Sans', 'Manrope', sans-serif",
    },
    card: {
      width: "100%",
      maxWidth: 440,
      background: "#171717",
      padding: "42px 38px",
      borderRadius: 20,
      border: "1px solid #303030",
      boxShadow: "0 18px 55px rgba(0,0,0,.55)",
    },
    logo: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 38,
    },
    logoIcon: {
      width: 52,
      height: 52,
      borderRadius: 14,
      background: "#321B29",
      border: "1px solid #563044",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#E85D9E",
    },
    brand: {
      margin: 0,
      color: "#FFFFFF",
      fontSize: 25,
      fontWeight: 800,
      letterSpacing: 2,
    },
    brandSub: {
      margin: "3px 0 0",
      color: "#A1A1AA",
      fontSize: 9,
      letterSpacing: 1.3,
      fontWeight: 700,
    },
    heading: {
      marginBottom: 25,
    },
    headingTitle: {
      color: "#FFFFFF",
      fontSize: 25,
      margin: "0 0 8px",
      fontWeight: 800,
    },
    headingDescription: {
      color: "#A1A1AA",
      fontSize: 14,
      margin: 0,
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: 11,
    },
    label: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: 700,
      marginTop: 8,
    },
    inputWrap: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      border: "1px solid #303030",
      borderRadius: 10,
      padding: "0 13px",
      height: 49,
      background: "#202020",
      color: "#E85D9E",
    },
    input: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      fontSize: 14,
      color: "#FFFFFF",
    },
    eyeButton: {
      border: "none",
      background: "transparent",
      color: "#E85D9E",
      cursor: "pointer",
      display: "flex",
    },
    submit: {
      marginTop: 18,
      minHeight: 50,
      border: "1px solid #E85D9E",
      borderRadius: 10,
      background: "#E85D9E",
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: 700,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    error: {
      color: "#FCA5A5",
      background: "#321B29",
      border: "1px solid #743052",
      padding: 11,
      borderRadius: 8,
      fontSize: 13,
      margin: 0,
    },
    success: {
      color: "#F9A8D4",
      background: "#321B29",
      border: "1px solid #743052",
      padding: 11,
      borderRadius: 8,
      fontSize: 13,
      lineHeight: 1.5,
      margin: 0,
    },
    switchSection: {
      marginTop: 24,
      textAlign: "center",
      borderTop: "1px solid #303030",
      paddingTop: 20,
    },
    switchText: {
      color: "#A1A1AA",
      fontSize: 13,
      margin: "0 0 8px",
    },
    switchButton: {
      border: "none",
      background: "transparent",
      color: "#E85D9E",
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
    },
    memberNote: {
      textAlign: "center",
      color: "#A1A1AA",
      fontSize: 11,
      margin: "15px 0 0",
    },
    footer: {
      marginTop: 28,
      textAlign: "center",
      color: "#71717A",
      fontSize: 11,
    },
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <Leaf size={27} />
          </div>
          <div>
            <h1 style={styles.brand}>OSP</h1>
            <p style={styles.brandSub}>
              PROJECT INTELLIGENCE HUB
            </p>
          </div>
        </div>

        <div style={styles.heading}>
          <h2 style={styles.headingTitle}>
            {isSignup ? "Create your account" : "Welcome back"}
          </h2>
          <p style={styles.headingDescription}>
            {isSignup
              ? "Join the OSP project management workspace."
              : "Sign in to access your workspace."}
          </p>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <label style={styles.label}>Full Name</label>
              <div style={styles.inputWrap}>
                <User size={18} />
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <label style={styles.label}>Email Address</label>
          <div style={styles.inputWrap}>
            <Mail size={18} />
            <input
              style={styles.input}
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label style={styles.label}>Password</label>
          <div style={styles.inputWrap}>
            <LockKeyhole size={18} />
            <input
              style={styles.input}
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              style={styles.eyeButton}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          {isSignup && (
            <>
              <label style={styles.label}>Confirm Password</label>
              <div style={styles.inputWrap}>
                <LockKeyhole size={18} />
                <input
                  style={styles.input}
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {error && <p style={styles.error}>{error}</p>}
          {success && <p style={styles.success}>{success}</p>}

          <button
            type="submit"
            style={styles.submit}
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isSignup
                ? "Create Account"
                : "Sign In"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div style={styles.switchSection}>
          <p style={styles.switchText}>
            {isSignup
              ? "Already have an account?"
              : "Don't have an account?"}
          </p>
          <button
            type="button"
            style={styles.switchButton}
            onClick={() =>
              switchMode(isSignup ? "login" : "signup")
            }
          >
            {isSignup ? "Sign In" : "Create New Account"}
          </button>
        </div>

        {isSignup && (
          <p style={styles.memberNote}>
            New accounts are registered with Member access.
          </p>
        )}

        <p style={styles.footer}>
          One Platform. Every Project. Every Achievement.
        </p>
      </section>
    </main>
  );
}
