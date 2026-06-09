import React from 'react';
import { Link } from 'react-router-dom';
export default function AuthErrorPage() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f0f1a', color:'#fff', flexDirection:'column', gap:'16px', textAlign:'center', padding:'20px' }}>
      <div style={{ fontSize:'48px' }}>⚠️</div>
      <h2 style={{ fontSize:'22px', fontWeight:'bold' }}>Authentication Failed</h2>
      <p style={{ color:'#94a3b8', maxWidth:'400px' }}>Something went wrong during sign-in. This can happen if your account permissions changed or there was a network issue.</p>
      <Link to="/login" style={{ background:'#6366f1', color:'#fff', padding:'12px 28px', borderRadius:'10px', textDecoration:'none', fontWeight:'bold', marginTop:'8px' }}>
        Try Again
      </Link>
    </div>
  );
}
