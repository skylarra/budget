import React from 'react';
import { useState } from 'react';
import axios from 'axios';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post("http://localhost:5000/auth/login", {email, password});
            const { token, name } = response.data;
            localStorage.setItem("token", token); // Store the token in local storage
            localStorage.setItem("userName", name); // Store the user name in local storage
            // Redirect to dashboard or home page
            window.location.href = "/"; // Change this to your desired route
        } catch (err) {
            setError(err.response.data.error);
        }
    };

    return (
        <div className="Enter">
            <h2>Login</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleLogin}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit">Login</button>
            </form>
        </div>
    );
};

export default Login;