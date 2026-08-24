import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../common/Input';
import Button from '../common/Button';

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(form.email, form.password);

      if (user.role === "quality_engineer") {
        navigate("/qe/dashboard");
      } else if (user.role === "supervisor") {
        navigate("/supervisor/dashboard");
      } else {
        navigate("/");
      }

    } catch (err) {
      setError(err.message || "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="Email"
        type="email"
        name="email"
        value={form.email}
        onChange={handleChange}
        placeholder="you@company.com"
        required
      />
      <Input
        label="Password"
        type="password"
        name="password"
        value={form.password}
        onChange={handleChange}
        placeholder="••••••••"
        required
      />
      {error && <p className="field-error" style={{ marginBottom: 16 }}>{error}</p>}
      <Button type="submit" loading={loading} className="w-full" style={{ width: '100%' }}>
        Sign in
      </Button>
    </form>
  );
}
