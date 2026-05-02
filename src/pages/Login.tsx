import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const LoginPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to auth page
    navigate('/auth', { replace: true });
  }, [navigate]);

  return null;
};

export default LoginPage;
