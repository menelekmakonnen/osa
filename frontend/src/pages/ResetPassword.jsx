import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Button, Card, Input } from '../components/ui';
import { Lock } from 'lucide-react';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  if (!token) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto mt-10">
        <h2 className="text-xl font-bold text-ink-title mb-2">Invalid Reset Link</h2>
        <p className="text-ink-muted mb-6">The password reset link is missing or invalid.</p>
        <Link to="/login">
          <Button className="w-full">Return to Login</Button>
        </Link>
      </Card>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError('');
    setLoading(true);

    try {
      await api.completePasswordReset(token, password);
      setStatus('Password reset successful! You can now log in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (status) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto mt-10">
        <h2 className="text-xl font-bold text-brand-600 mb-2">Success!</h2>
        <p className="text-ink-muted mb-6">{status}</p>
        <Link to="/login">
          <Button className="w-full">Go to Login</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-8 max-w-md mx-auto mt-10">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-ink-title mb-2">Create New Password</h2>
        <p className="text-muted text-sm">Enter your new password below.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="relative">
          <Lock className="absolute left-3 top-9 text-muted" size={18} />
          <Input 
            label="New Password"
            type="password"
            placeholder="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="[&>input]:pl-10"
            required
            minLength={8}
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-9 text-muted" size={18} />
          <Input 
            label="Confirm Password"
            type="password"
            placeholder="Retype password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="[&>input]:pl-10"
            required
            minLength={8}
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full mt-4">
          {loading ? 'Processing...' : 'Reset Password'}
        </Button>
      </form>
    </Card>
  );
}
