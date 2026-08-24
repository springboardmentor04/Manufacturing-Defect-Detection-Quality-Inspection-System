import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import Input from '../common/Input';
import Button from '../common/Button';

export default function RegisterForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'quality_engineer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.register(form);
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Could not create your account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Input label="Full name" name="full_name" value={form.full_name} onChange={handleChange} required />
      <Input label="Email" type="email" name="email" value={form.email} onChange={handleChange} required />
      <Input label="Password" type="password" name="password" value={form.password} onChange={handleChange} required />

      <div className="field">
        <label className="field-label" htmlFor="role">Role</label>
        <select id="role" name="role" className="field-input" value={form.role} onChange={handleChange}>
          <option value="quality_engineer">Quality Engineer</option>
          <option value="supervisor">Supervisor</option>
        </select>
      </div>

      {error && <p className="field-error" style={{ marginBottom: 16 }}>{error}</p>}
      <Button type="submit" loading={loading} style={{ width: '100%' }}>
        Create account
      </Button>
    </form>
  );
}
