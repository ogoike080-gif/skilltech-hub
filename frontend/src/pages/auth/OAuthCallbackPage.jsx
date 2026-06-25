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
    const accessToken =
      searchParams.get('access') ||
      searchParams.get('token') ||
      searchParams.get('accessToken');

   console.log('OAuth access:', accessToken);
console.log('OAuth refresh:', refreshToken);

    if (!accessToken) {
      setError('Authentication failed. No token received.');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
      return;
    }

    localStorage.setItem('sth_token', accessToken);

    if (refreshToken) {
      localStorage.setItem('sth_refresh', refreshToken);
    }

    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));

      const API_URL = import.meta.env.VITE_API_URL || '';
      console.log("API_URL =", API_URL);

      fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          const user = data?.data || {};

          dispatch(
            authActions.setCredentials({
              accessToken,
              refreshToken,
              user: {
                id: user.id || payload.userId,
                email: user.email || '',
                firstName: user.first_name || 'User',
                lastName: user.last_name || '',
                role: user.role || payload.role || 'student',
                avatarUrl: user.avatar_url || null,
                isVerified: user.is_verified || false,
                subscriptionTier: user.subscription_tier || 'free',
              },
            })
          );

          navigate('/dashboard', { replace: true });
        })
        .catch(() => {
          dispatch(
            authActions.setCredentials({
              accessToken,
              refreshToken,
              user: {
                id: payload.userId,
                role: payload.role || 'student',
                email: '',
                firstName: 'User',
                lastName: '',
              },
            })
          );

          navigate('/dashboard', { replace: true });
        });
    } catch (err) {
      console.error('OAuth callback error:', err);

      setError('Failed to process authentication.');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    }
  }, [dispatch, navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>
          <h2>Authentication Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div>
        <Zap size={28} />
        <h2>Signing you in...</h2>
      </div>
    </div>
  );
}
