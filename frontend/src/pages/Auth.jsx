import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Button, Card, Input } from '../components/ui';
import { Mail, Lock, User, School, Hash, Key } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

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
  const { schoolId, isCustomDomain, name: tenantName } = useTenant();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    school_id: isCustomDomain ? schoolId : '',
    new_school_name: '',
    new_school_admin_id: '',
    year_group_id: '',
    new_yg_year: '',
    new_yg_nickname: '',
    final_class: '',
    house_name: '',
    new_school_classes: '',
    new_school_houses: ''
  });
  
  const [schools, setSchools] = useState([]);
  const [yearGroups, setYearGroups] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch Schools and Year Groups based on context
    const fetchRequiredData = async () => {
       try {
          if (!isCustomDomain) {
             const schoolList = await api.getSchools();
             setSchools(schoolList.data || []);
          }
          // Only fetch Year Groups if we know the target school (either via custom domain or user selection)
          if (formData.school_id && formData.school_id !== 'new_school') {
             const ygList = await api.getYearGroupsList(); // v1 mock behaviour limits to one school
             setYearGroups(ygList || []);
          } else {
             setYearGroups([]);
          }
       } catch (err) {
          console.error("Failed to fetch registration data", err);
       } finally {
          setFetchingData(false);
       }
    };

    fetchRequiredData();
  }, [isCustomDomain, formData.school_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (formData.school_id === 'new_school') {
         // Flow to create a new school + Super Admin
         await api.onboardSchool(formData);
         navigate('/app/dashboard'); // Or a pending screen
      } else {
         // Standard registration
         await api.register(formData);
         navigate('/app/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isNewSchoolFlow = formData.school_id === 'new_school';
  const selectedSchool = schools.find(s => s.id === formData.school_id);
  const activeClasses = selectedSchool?.classes || [];
  const activeHouses = selectedSchool?.houses || [];

  return (
    <Card className="p-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-heading text-forest mb-2">
           {isCustomDomain ? `Join ${tenantName}` : "Join OSA Network"}
        </h1>
        <p className="text-muted text-sm">
           {isNewSchoolFlow ? "Register a new school association as Super Admin" : "Create your portal account"}
        </p>
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

        {!isCustomDomain && (
          <div className="mt-2 border-t border-border-light pt-4 flex flex-col gap-3">
             <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide block">Select School</label>
             <select 
                 name="school_id"
                 className="osa-select w-full"
                 value={formData.school_id}
                 onChange={handleChange}
                 required
                 disabled={fetchingData}
             >
                 <option value="">Choose your School...</option>
                 {schools.map(s => (
                     <option key={s.id} value={s.id}>{s.name} ({s.short_code})</option>
                 ))}
             </select>
             {!isNewSchoolFlow && (
                 <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 mt-1"
                    onClick={() => setFormData(p => ({...p, school_id: 'new_school'}))}
                 >
                    + Register a new School
                 </Button>
             )}
          </div>
        )}

        {isNewSchoolFlow ? (
           <div className="flex flex-col gap-4 mt-2 bg-sage/5 p-4 rounded-xl border border-sage/20">
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Super Admin Verification</label>
              <Input 
                 name="new_school_name"
                 placeholder="Official School Name"
                 value={formData.new_school_name}
                 onChange={handleChange}
                 required
              />
              <Input 
                 name="new_school_admin_id"
                 placeholder="Alumni Exec/Staff Verification ID Number"
                 value={formData.new_school_admin_id}
                 onChange={handleChange}
                 required
              />
              <Input 
                 name="new_school_classes"
                 placeholder="Class List (e.g. Science 1, Arts 3) - Comma Separated"
                 value={formData.new_school_classes}
                 onChange={handleChange}
                 required
              />
              <Input 
                 name="new_school_houses"
                 placeholder="House Names (e.g. WatKat, Casford) - Comma Separated"
                 value={formData.new_school_houses}
                 onChange={handleChange}
                 required
              />
              <p className="text-xs text-ink-muted">Note: New school accounts require manual approval by ICUNI Labs before they become active on the network. Our team will contact you using the email provided above.</p>
           </div>
        ) : (
           <>
              <div className="grid grid-cols-2 gap-4 mt-2">
                  <select 
                      name="year_group_id"
                      className="osa-select"
                      value={formData.year_group_id}
                      onChange={handleChange}
                      required
                      disabled={fetchingData || !formData.school_id}
                  >
                      <option value="">Select Year Group</option>
                      {yearGroups.map(yg => (
                          <option key={yg.id} value={yg.id}>Class of {yg.year}</option>
                      ))}
                      <option value="new_yg" className="font-semibold text-brand-600">+ Create New Year Group</option>
                  </select>

                  {activeClasses.length > 0 ? (
                      <select 
                          name="final_class"
                          className="osa-select"
                          value={formData.final_class}
                          onChange={handleChange}
                          required
                      >
                          <option value="">Select Final Class</option>
                          {activeClasses.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                  ) : (
                      <Input 
                          name="final_class"
                          placeholder="Final Class (e.g. 3A)"
                          value={formData.final_class}
                          onChange={handleChange}
                          required
                      />
                  )}
              </div>

              {activeHouses.length > 0 ? (
                  <select 
                      name="house_name"
                      className="osa-select"
                      value={formData.house_name}
                      onChange={handleChange}
                      required
                  >
                      <option value="">Select House Name</option>
                      {activeHouses.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
              ) : (
                  <Input 
                      name="house_name"
                      placeholder="School House Name"
                      value={formData.house_name}
                      onChange={handleChange}
                      required
                  />
              )}

              {formData.year_group_id === 'new_yg' && (
                  <div className="grid grid-cols-2 gap-4 mt-2 bg-brand-50/50 p-4 rounded-xl border border-brand-200 col-span-full">
                      <div className="col-span-full mb-1">
                          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Create Year Group</label>
                      </div>
                      <Input 
                          name="new_yg_year"
                          placeholder="Graduating Year (e.g. 2012)"
                          value={formData.new_yg_year}
                          onChange={handleChange}
                          required
                      />
                      <Input 
                          name="new_yg_nickname"
                          placeholder="Nickname (e.g. The Pioneers)"
                          value={formData.new_yg_nickname}
                          onChange={handleChange}
                          required
                      />
                  </div>
              )}
           </>
        )}

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
