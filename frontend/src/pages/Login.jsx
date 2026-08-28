import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";

import api from "../services/api";
import AuthLayout from "../components/AuthLayout";

import "../styles/Login.css";

function Login() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] =useState(false);

    const [error, setError] = useState("");

    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        setLoading(true);

        setError("");

        try {

            const response = await api.post("/login", formData);

            localStorage.setItem(
                "token",
                response.data.access_token
            );

            localStorage.setItem(
                "user",
                JSON.stringify(response.data.user)
            );

            const role = response.data.user.role;

            setTimeout(() => {

                if (role === "QUALITY_ENGINEER") {

                    navigate("/dashboard");

                }

                else if (role === "FACTORY_SUPERVISOR") {

                    navigate("/supervisor/dashboard");

                }

                else {

                    navigate("/");

                }

            }, 800);

        }

        catch (err) {

            if (err.response) {

                setError(err.response.data.detail);

            }

            else {

                setError("Unable to connect to the server.");

            }

        }

        finally {

            setLoading(false);

        }

    };

    return (

        <AuthLayout
            title="Welcome Back"
            subtitle="Login to continue to VisionInspect AI"
        >

            <form
                className="login-form"
                onSubmit={handleSubmit}
            >

                <label>Email Address</label>

                <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />

                <label>Password</label>

                <div className="password-box">

                    <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <button
                        type="button"
                        className="eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                    >

                        {

                            showPassword ?

                            <EyeOff size={20}/>

                            :

                            <Eye size={20}/>

                        }

                    </button>

                </div>

                {

                    error &&

                    <div className="error-box">

                        {error}

                    </div>

                }

                <button
                    className="login-btn"
                    disabled={loading}
                >

                    {

                        loading ?

                        "Authenticating..."

                        :

                        <>

                            <LogIn size={18}/>

                            Login

                        </>

                    }

                </button>

                <div className="login-footer">

                    Don't have an account?

                    <Link to="/register">

                        Register

                    </Link>

                </div>

            </form>

        </AuthLayout>

    );

}

export default Login;