import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { authActions, selectUser, selectIsAuth, selectToken } from '../store';
import api from '../utils/api';
import toast from 'react-hot-toast';

export function useAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user     = useSelector(selectUser);
  const isAuth   = useSelector(selectIsAuth);
  const token    = useSelector(selectToken);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    dispatch(authActions.setCredentials(data.data));
    toast.success(`Welcome back, ${data.data.user.firstName}!`);
    navigate('/dashboard');
  };

  const register = async (formData) => {
    await api.post('/auth/register', formData);
    toast.success('Account created! Please verify your email.');
    navigate('/login');
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('sth_refresh');
      await api.post('/auth/logout', { refreshToken: refresh });
    } catch {}
    dispatch(authActions.logout());
    navigate('/');
  };

  const updateProfile = async (data) => {
    await api.put('/users/profile', data);
    dispatch(authActions.updateUser(data));
    toast.success('Profile updated');
  };

  return { user, isAuth, token, login, register, logout, updateProfile };
}
