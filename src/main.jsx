// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Login from "./Login.jsx";
import { useAuth } from "./useAuth.js";

function Root() {
  const { user, loading, error, setError, signIn, signOut } = useAuth();

  if (loading) return (
    <div style={{ background:"#0e0e0e", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, fontFamily:"sans-serif", color:"#f0ede8" }}>
      <div style={{ fontFamily:"serif", fontSize:28, color:"#f5a623", letterSpacing:3 }}>CANTONIMP</div>
      <div style={{ width:36, height:36, border:"3px solid #2e2e2e", borderTop:"3px solid #f5a623", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!user) {
    return <Login onLogin={signIn} error={error} loading={loading} />;
  }

  return <App onSignOut={signOut} userEmail={user.email} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
