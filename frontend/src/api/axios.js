import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn("Session Expired or Unauthorized. Redirecting to Login...");
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_data');
            // บังคับ Reload ไปหน้า Login
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;