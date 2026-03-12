import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Button, Card, Input } from '../components/ui';
import { Mail, Lock, User, School, Hash, Key } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.login(email, password);
      // Success - navigate to dashboard
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-heading text-forest mb-2">OSA</h1>
        <p className="text-muted">Sign in to your Alumni Platform</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="relative">
          <Mail className="absolute left-3 top-3.5 text-muted" size={18} />
          <Input 
            placeholder="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
        
        <div className="relative">
          <Lock className="absolute left-3 top-3.5 text-muted" size={18} />
          <Input 
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10"
            required
          />
        </div>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-sage hover:underline">
            Forgot Password?
          </Link>
        </div>

        <Button type="submit" disabled={loading} className="w-full mt-2">
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>

        <div className="text-center mt-4 text-sm text-muted">
          Don't have an account? <Link to="/register" className="text-sage hover:underline font-medium">Register here</Link>
        </div>
      </form>
    </Card>
  );
}

export function Register() {
  // Simplified for v1 - assuming Aggrey Memorial pre-selected
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    year_group_id: '',
    final_class: '',
    house_name: ''
  });
  
  const [yearGroups, setYearGroups] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingYGs, setFetchingYGs] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch Year Groups for the dropdown
    api.getYearGroupsList()
      .then(res => setYearGroups(res || []))
      .catch(err => {
          console.warn("Failed to fetch YGs", err);
          setYearGroups([
              { id: 'yg-1', year: '2012', nickname: 'The Millenniums' },
              { id: 'yg-2', year: '2005', nickname: 'Pioneers' }
          ]); // Mock fallback if API not ready
      })
      .finally(() => setFetchingYGs(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.register(formData);
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <Card className="p-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-heading text-forest mb-2">Join Aggrey Memorial</h1>
        <p className="text-muted text-sm">Create your OSA portal account</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input 
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        
        <Input 
          name="email"
          type="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <Input 
          name="password"
          type="password"
          placeholder="Create Password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <div className="grid grid-cols-2 gap-4">
            <select 
                name="year_group_id"
                className="osa-select"
                value={formData.year_group_id}
                onChange={handleChange}
                required
                disabled={fetchingYGs}
            >
                <option value="">Select Year Group</option>
                {yearGroups.map(yg => (
                    <option key={yg.id} value={yg.id}>Class of {yg.year}</option>
                ))}
            </select>

            <Input 
                name="final_class"
                placeholder="Final Class (e.g. 3A)"
                value={formData.final_class}
                onChange={handleChange}
                required
            />
        </div>

        <Input 
            name="house_name"
            placeholder="School House Name"
            value={formData.house_name}
            onChange={handleChange}
            required
        />

        <Button type="submit" disabled={loading} className="w-full mt-2">
          {loading ? 'Creating Account...' : 'Register as Member'}
        </Button>

        <div className="text-center mt-4 text-sm text-muted">
          Already have an account? <Link to="/login" className="text-sage hover:underline font-medium">Sign in</Link>
        </div>
      </form>
    </Card>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // In v1, this calls the GAS endpoint but acts as a mock locally
    api.getRequest?.("resetPassword", { email }).catch(() => {});
    setStatus('If your email is registered, a password reset link has been sent.');
  };

  return (
    <Card className="p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-heading text-forest mb-2">Reset Password</h2>
        <p className="text-muted text-sm">Enter your email to receive a reset link</p>
      </div>

      {status && (
        <div className="bg-sage bg-opacity-10 text-sage p-3 rounded-md mb-4 text-sm text-center">
          {status}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input 
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Button type="submit" className="w-full">
          Send Link
        </Button>

        <div className="text-center mt-4 text-sm">
          <Link to="/login" className="text-sage hover:underline">Back to Login</Link>
        </div>
      </form>
    </Card>
  );
}
