import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Eye,
    EyeOff,
    UserPlus,
} from "lucide-react";

import api from "../services/api";
import AuthLayout from "../components/AuthLayout";

import "../styles/Register.css";

function Register() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({

        first_name: "",
        last_name: "",
        employee_id: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        department: "",
        role: "QUALITY_ENGINEER"

    });

    const [showPassword, setShowPassword] = useState(false);

    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    const [success, setSuccess] = useState("");

    const handleChange = (e) => {

        setFormData({

            ...formData,

            [e.target.name]: e.target.value

        });

    };

    const getPasswordStrength = (password) => {

        let score = 0;

        if(password.length >= 8) score++;

        if(/[A-Z]/.test(password)) score++;

        if(/[0-9]/.test(password)) score++;

        if(/[!@#$%^&*]/.test(password)) score++;

        return score;

    };

    const strength = getPasswordStrength(formData.password);

    const handleSubmit = async (e) => {

        e.preventDefault();

        setLoading(true);

        setError("");

        setSuccess("");

        if(formData.password !== formData.confirmPassword){

            setLoading(false);

            setError("Passwords do not match.");

            return;

        }

        try{

            const payload = {

                first_name: formData.first_name,

                last_name: formData.last_name,

                employee_id: formData.employee_id,

                email: formData.email,

                password: formData.password,

                phone: formData.phone,

                department: formData.department,

                role: formData.role

            };

            const response = await api.post("/register", payload);

            setSuccess(response.data.message);

            setTimeout(()=>{

                navigate("/");

            },1800);

        }

        catch(err){

            if(err.response)

                setError(err.response.data.detail);

            else

                setError("Unable to connect to server.");

        }

        finally{

            setLoading(false);

        }

    };

    return(

        <AuthLayout

            title="Create Account"

            subtitle="Register to access VisionInspect AI"

        >

            <form

                className="register-form"

                onSubmit={handleSubmit}

            >

                <div className="two-column">

                    <div>

                        <label>First Name</label>

                        <input

                            type="text"

                            name="first_name"

                            value={formData.first_name}

                            onChange={handleChange}

                            required

                        />

                    </div>

                    <div>

                        <label>Last Name</label>

                        <input

                            type="text"

                            name="last_name"

                            value={formData.last_name}

                            onChange={handleChange}

                            required

                        />

                    </div>

                </div>

                <label>Employee ID</label>

                <input

                    type="text"

                    name="employee_id"

                    value={formData.employee_id}

                    onChange={handleChange}

                    required

                />

                <label>Email</label>

                <input

                    type="email"

                    name="email"

                    value={formData.email}

                    onChange={handleChange}

                    required

                />

                <label>Password</label>

                <div className="password-box">

                    <input

                        type={showPassword ? "text":"password"}

                        name="password"

                        value={formData.password}

                        onChange={handleChange}

                        required

                    />

                    <button

                        type="button"

                        className="eye-btn"

                        onClick={()=>setShowPassword(!showPassword)}

                    >

                        {

                            showPassword

                            ?

                            <EyeOff size={18}/>

                            :

                            <Eye size={18}/>

                        }

                    </button>

                </div>

                <div className="strength">

                    <div className={`bar ${strength>=1?"active":""}`}></div>

                    <div className={`bar ${strength>=2?"active":""}`}></div>

                    <div className={`bar ${strength>=3?"active":""}`}></div>

                    <div className={`bar ${strength>=4?"active":""}`}></div>

                </div>

                <label>Confirm Password</label>

                <div className="password-box">

                    <input

                        type={showConfirmPassword ? "text":"password"}

                        name="confirmPassword"

                        value={formData.confirmPassword}

                        onChange={handleChange}

                        required

                    />

                    <button

                        type="button"

                        className="eye-btn"

                        onClick={()=>setShowConfirmPassword(!showConfirmPassword)}

                    >

                        {

                            showConfirmPassword

                            ?

                            <EyeOff size={18}/>

                            :

                            <Eye size={18}/>

                        }

                    </button>

                </div>

                <div className="two-column">

                    <div>

                        <label>Phone</label>

                        <input

                            type="text"

                            name="phone"

                            value={formData.phone}

                            onChange={handleChange}

                            required

                        />

                    </div>

                    <div>

                        <label>Department</label>

                        <input

                            type="text"

                            name="department"

                            value={formData.department}

                            onChange={handleChange}

                            required

                        />

                    </div>

                </div>

                <label>Role</label>

                <select

                    name="role"

                    value={formData.role}

                    onChange={handleChange}

                >

                    <option value="QUALITY_ENGINEER">

                        🛡️ Quality Engineer

                    </option>

                    <option value="FACTORY_SUPERVISOR">

                        🏭 Factory Supervisor

                    </option>

                </select>

                {

                    error &&

                    <div className="error-box">

                        {error}

                    </div>

                }

                {

                    success &&

                    <div className="success-box">

                        ✔ {success}

                    </div>

                }

                <button

                    className="register-btn"

                    disabled={loading}

                >

                    {

                        loading

                        ?

                        "Creating Account..."

                        :

                        <>

                            <UserPlus size={18}/>

                            Register

                        </>

                    }

                </button>

                <div className="register-footer">

                    Already have an account?

                    <Link to="/">

                        Login

                    </Link>

                </div>

            </form>

        </AuthLayout>

    );

}

export default Register;