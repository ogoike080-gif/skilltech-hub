import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authActions } from '../../store';
import { Zap } from 'lucide-react';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState('');

  useEffect(() => {
    const accessToken  = searchParams.get('access');
    const refreshToken = searchParams.get('refresh');

    if (!accessToken) {
      setError('Authentication failed. No token received.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    // Store tokens immediately
    localStorage.setItem('sth_token',   accessToken);
    localStorage.setItem('sth_refresh', refreshToken || '');

    // Decode user info from JWT payload (avoid an extra network call)
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));

      // Fetch full user profile
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            dispatch(authActions.setCredentials({
              accessToken,
              refreshToken,
              user: {
                id:               data.data.id,
                email:            data.data.email,
                firstName:        data.data.first_name,
                lastName:         data.data.last_name,
                role:             data.data.role,
                avatarUrl:        data.data.avatar_url,
                isVerified:       data.data.is_verified,
                subscriptionTier: data.data.subscription_tier,
              },
            }));
            navigate('/dashboard', { replace: true });
          } else {
            // JWT-only fallback if /me fails
            dispatch(authActions.setCredentials({
              accessToken,
              refreshToken,
              user: {
                id:    payload.userId,
                role:  payload.role,
                email: '',
                firstName: 'User',
                lastName:  '',
              },
            }));
            navigate('/dashboard', { replace: true });
          }
        })
        .catch(() => {
          // Even if profile fetch fails, we have tokens — go to dashboard
          dispatch(authActions.setCredentials({
            accessToken,
            refreshToken,
            user: { id: payload.userId, role: payload.role, firstName: 'User', lastName: '', email: '' },
          }));
          navigate('/dashboard', { replace: true });
        });
    } catch (err) {
      setError('Failed to process authentication. Please try again.');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4" style={{ background: '#0f0f1a' }}>
        <div>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#ef444420' }}>
            <Zap size={28} style={{ color: '#ef4444' }} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Authentication Error</h2>
          <p style={{ color: '#94a3b8' }}>{error}</p>
          <p style={{ color: '#475569', fontSize: '13px', marginTop: '8px' }}>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-center" style={{ background: '#0f0f1a' }}>
      <div>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: '#6366f120' }}>
          <Zap size={28} style={{ color: '#818cf8' }} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Signing you in...</h2>
        <p style={{ color: '#94a3b8', marginBottom: '12px' }}>Please wait a moment</p>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#6366f1', animation: 'bounce 0.9s infinite',
              animationDelay: `${i * 0.15}s`
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
