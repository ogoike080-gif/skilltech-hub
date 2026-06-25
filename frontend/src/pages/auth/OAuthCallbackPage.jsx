import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authActions } from '../../store';
import api from '../../utils/api';
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

    const refreshToken =
      searchParams.get('refresh') ||
      searchParams.get('refreshToken');

    console.log('OAuth access:', accessToken);
    console.log('OAuth refresh:', refreshToken);

    if (!accessToken) {
      setError('Authentication failed.');
      return;
    }

    localStorage.setItem('sth_token', accessToken);

    if (refreshToken) {
      localStorage.setItem('sth_refresh', refreshToken);
    }

    api
      .get('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .then((res) => {
        const user = res.data.data;

        dispatch(
          authActions.setCredentials({
            accessToken,
            refreshToken,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              role: user.role,
              avatarUrl: user.avatar_url,
              isVerified: user.is_verified,
              subscriptionTier: user.subscription_tier,
            },
          })
        );

        navigate('/dashboard', { replace: true });
      })
      .catch((err) => {
        console.error(err);

        const payload = JSON.parse(
          atob(accessToken.split('.')[1])
        );

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
  }, [dispatch, navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Zap className="mx-auto mb-4" />
        <h2>Signing you in...</h2>
      </div>
    </div>
  );
}