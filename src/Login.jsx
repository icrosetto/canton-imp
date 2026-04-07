// src/Login.jsx
import { useState } from "react";

const loginCss = `
  .login-wrap{
    background:#0e0e0e;min-height:100vh;display:flex;flex-direction:column;
    align-items:center;justify-content:center;padding:24px;
    font-family:'DM Sans',sans-serif;color:#f0ede8;
  }
  .login-logo{
    font-family:'Bebas Neue',sans-serif;font-size:42px;letter-spacing:3px;
    color:#f5a623;margin-bottom:6px;line-height:1;
  }
  .login-logo span{color:#f0ede8;}
  .login-sub{font-size:13px;color:#7a7672;margin-bottom:40px;letter-spacing:.5px;}
  .login-card{
    background:#181818;border:1px solid #2e2e2e;border-radius:16px;
    padding:28px 24px;width:100%;max-width:360px;
  }
  .login-title{
    font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:1.5px;
    color:#f5a623;margin-bottom:20px;
  }
  .login-fg{margin-bottom:14px;}
  .login-label{
    display:block;font-size:10px;font-weight:700;letter-spacing:1px;
    text-transform:uppercase;color:#7a7672;margin-bottom:5px;
  }
  .login-input{
    width:100%;background:#222;border:1px solid #2e2e2e;border-radius:8px;
    padding:11px 14px;color:#f0ede8;font-family:'DM Sans',sans-serif;
    font-size:15px;outline:none;transition:border-color .15s;
    box-sizing:border-box;
  }
  .login-input:focus{border-color:#f5a623;}
  .login-input::placeholder{color:#7a7672;}
  .login-btn{
    width:100%;background:#f5a623;color:#0e0e0e;border:none;border-radius:8px;
    padding:13px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;
    cursor:pointer;transition:background .15s;margin-top:4px;
  }
  .login-btn:hover{background:#e8890a;}
  .login-btn:disabled{background:#3a3a3a;color:#7a7672;cursor:not-allowed;}
  .login-error{
    background:#3a1a1a;border:1px solid #e05252;border-radius:7px;
    padding:9px 12px;font-size:12px;color:#e05252;margin-bottom:14px;
  }
`;

export default function Login({ onLogin, error, loading }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;
    await onLogin(email, password);
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap');${loginCss}`}</style>
      <div className="login-wrap">
        <div className="login-logo">CANTON<span>IMP</span></div>
        <div className="login-sub">Gestión de importaciones</div>
        <div className="login-card">
          <div className="login-title">Iniciar Sesión</div>
          {error && <div className="login-error">⚠️ {error === "Invalid login credentials" ? "Email o contraseña incorrectos" : error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="login-fg">
              <label className="login-label">Email</label>
              <input
                className="login-input"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            <div className="login-fg">
              <label className="login-label">Contraseña</label>
              <input
                className="login-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button className="login-btn" type="submit" disabled={loading || !email || !password}>
              {loading ? "Ingresando..." : "Entrar →"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
