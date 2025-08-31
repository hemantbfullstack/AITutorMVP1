import { useAuth } from '../hooks/useAuth';

export const apiRequest = async (
  url: string,
  options: RequestInit = {}
) => {
  const token = localStorage.getItem('authToken');
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: 'include',
  };

  const response = await fetch(url, config);
  
  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};
