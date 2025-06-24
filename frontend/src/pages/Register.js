import { useState } from 'react';
import axios from 'axios';

const Register = () => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [budget_start_date, setBudgetStartDate] = useState('');
    const [error, setError] = useState(null);

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post("http://localhost:5000/auth/register", {email, name, password, budget_start_date});
            const { token } = response.data;
            localStorage.setItem("token", token); // Store the token in local storage
            // Redirect to dashboard or home page
            window.location.href = "http://localhost:3000/login"; // Change this to your desired route
        } catch (err) {
            setError(err.response.data.error);
        }
    };

    return (
        <div className="Enter">
            <h2>Register</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleRegister} method='POST'>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <input
                    type="date"
                    placeholder="Budget Start Date"
                    value={budget_start_date}
                    onChange={(e) => setBudgetStartDate(e.target.value)}
                    required
                />
                <button type="submit">Register</button>
            </form>
        </div>
    );
};

export default Register;