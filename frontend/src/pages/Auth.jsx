import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Button, Card, Input, Select, Badge } from '../components/ui';
import { Mail, Lock, User, School, Hash, Key, X } from 'lucide-react';
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
          <Mail className="absolute left-3 top-9 text-muted" size={18} />
          <Input 
            label="Email Address"
            placeholder="name@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="[&>input]:pl-10"
            required
          />
        </div>
        
        <div className="relative">
          <Lock className="absolute left-3 top-9 text-muted" size={18} />
          <Input 
            label="Password"
            placeholder="Enter your password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="[&>input]:pl-10"
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
    username: '',
    email: '',
    password: '',
    school_id: isCustomDomain ? schoolId : '',
    new_school_name: '',
    new_school_motto: '',
    new_school_cheque_representation: 'N/A',
    new_school_type: 'Mixed',
    new_school_admin_id: '',
    year_group_id: '',
    new_yg_year: '',
    new_yg_nickname: '',
    final_class: '',
    house_name: '',
    gender: '', // Required if school is mixed
  });

  const [dynamicClasses, setDynamicClasses] = useState([""]);
  const [dynamicHouses, setDynamicHouses] = useState([{ name: "", gender: "Boys" }]);
  const [dynamicColours, setDynamicColours] = useState(["Mauve", "Yellow"]);
  
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

  const handleDynamicClassChange = (index, value) => {
    const newClasses = [...dynamicClasses];
    newClasses[index] = value;
    setDynamicClasses(newClasses);
  };

  const handleDynamicHouseChange = (index, field, value) => {
    const newHouses = [...dynamicHouses];
    newHouses[index][field] = value;
    setDynamicHouses(newHouses);
  };

  const handleDynamicColourChange = (index, value) => {
    const newColours = [...dynamicColours];
    newColours[index] = value;
    setDynamicColours(newColours);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError('');

    if (formData.school_id === 'new_school') {
       // Filter empty arrays
       const cleanClasses = dynamicClasses.filter(c => c.trim() !== "");
       const cleanHouses = dynamicHouses.filter(h => h.name.trim() !== "");
       const cleanColours = dynamicColours.filter(c => c.trim() !== "");
       
       if (cleanClasses.length === 0 || cleanHouses.length === 0 || cleanColours.length === 0) {
          setError("Please define at least one class, one house, and one colour.");
          return;
       }
       formData.new_school_classes = cleanClasses;
       formData.new_school_houses = cleanHouses;
       formData.new_school_colours = cleanColours;
    }

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
  
  const { activeClasses, activeHouses } = useMemo(() => {
    let classes = [];
    let houses = [];
    if (selectedSchool) {
      try {
        const classesArr = typeof selectedSchool.classes === 'string' ? JSON.parse(selectedSchool.classes) : (selectedSchool.classes || []);
        classes = classesArr;

        const housesArr = typeof selectedSchool.houses === 'string' ? JSON.parse(selectedSchool.houses) : (selectedSchool.houses || []);
        // Extract the 'name' property as houses are now objects { name, gender }
        houses = housesArr.map(h => typeof h === 'object' ? h.name : h);
      } catch(e) {
        console.error("Failed to parse school classes or houses", e);
      }
    }
    return { activeClasses: classes, activeHouses: houses };
  }, [selectedSchool]);

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
          label="Full Name"
          name="name"
          placeholder="e.g. Jane Doe"
          value={formData.name}
          onChange={handleChange}
          required
        />
        
        <Input 
          label="Username"
          name="username"
          placeholder="e.g. janedoe"
          value={formData.username}
          onChange={handleChange}
          required
        />
        
        <Input 
          label="Email Address"
          name="email"
          type="email"
          placeholder="name@example.com"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <Input 
          label="Create Password"
          name="password"
          type="password"
          placeholder="Minimum 8 characters"
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
                 required={!isNewSchoolFlow}
                 disabled={fetchingData}
             >
                 <option value="">{isNewSchoolFlow ? "Building New Database..." : "Choose your School..."}</option>
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
                 label="Official School Name"
                 name="new_school_name"
                 placeholder="e.g. Aggrey Memorial"
                 value={formData.new_school_name}
                 onChange={handleChange}
                 required
              />
              <Input 
                 label="School Motto"
                 name="new_school_motto"
                 placeholder="Semper Optimo Nitere"
                 value={formData.new_school_motto}
                 onChange={handleChange}
              />
              <Select 
                 label="Cheque Colours represent..."
                 name="new_school_cheque_representation"
                 value={formData.new_school_cheque_representation}
                 onChange={handleChange}
                 options={[
                     {label: "N/A", value: "N/A"},
                     {label: "Year Groups", value: "Year Groups"},
                     {label: "Houses", value: "Houses"},
                     {label: "Courses", value: "Courses"}
                 ]}
              />
              <Input 
                 label="Alumni Verification ID"
                 name="new_school_admin_id"
                 placeholder="Exec/Staff ID Number"
                 value={formData.new_school_admin_id}
                 onChange={handleChange}
                 required
              />
              <Select 
                 label="School Type"
                 name="new_school_type"
                 value={formData.new_school_type}
                 onChange={(e) => {
                     handleChange(e);
                     // If switching away from mixed, reset genders to primary type
                     if (e.target.value !== 'Mixed') {
                         setDynamicHouses(dynamicHouses.map(h => ({...h, gender: e.target.value})));
                     }
                 }}
                 options={[
                     {label: "Mixed School", value: "Mixed"},
                     {label: "Boys School", value: "Boys"},
                     {label: "Girls School", value: "Girls"}
                 ]}
              />

              <div className="mt-2 text-sm">
                 <label className="text-sm font-semibold text-ink-title block mb-2 ml-1">School Colours</label>
                 {dynamicColours.map((c, i) => (
                    <div key={`col-${i}`} className="flex gap-2 mb-2">
                       <input 
                         className="social-input" 
                         placeholder="e.g. Mauve" 
                         value={c} 
                         onChange={(e) => handleDynamicColourChange(i, e.target.value)} 
                         required
                       />
                       {i > 0 && <button type="button" onClick={() => setDynamicColours(dynamicColours.filter((_, idx) => idx !== i))} className="icon-btn text-danger"><X size={16}/></button>}
                    </div>
                 ))}
                 <button type="button" onClick={() => setDynamicColours([...dynamicColours, ""])} className="text-sm text-brand-600 font-semibold ml-2 hover:underline">+ Add Colour</button>
              </div>

              <div className="mt-2">
                 <label className="text-sm font-semibold text-ink-title block mb-2 ml-1">Classes</label>
                 {dynamicClasses.map((c, i) => (
                    <div key={`c-${i}`} className="flex gap-2 mb-2">
                       <input 
                         className="social-input" 
                         placeholder="e.g. Science 1" 
                         value={c} 
                         onChange={(e) => handleDynamicClassChange(i, e.target.value)} 
                         required
                       />
                       {i > 0 && <button type="button" onClick={() => setDynamicClasses(dynamicClasses.filter((_, idx) => idx !== i))} className="icon-btn text-danger"><X size={16}/></button>}
                    </div>
                 ))}
                 <button type="button" onClick={() => setDynamicClasses([...dynamicClasses, ""])} className="text-sm text-brand-600 font-semibold ml-2 hover:underline">+ Add Class</button>
              </div>

              <div className="mt-4">
                 <label className="text-sm font-semibold text-ink-title block mb-2 ml-1">Houses/Halls</label>
                 {dynamicHouses.map((h, i) => (
                    <div key={`h-${i}`} className="flex gap-2 mb-2">
                       <input 
                         className="social-input" 
                         placeholder="e.g. Casford" 
                         value={h.name} 
                         onChange={(e) => handleDynamicHouseChange(i, 'name', e.target.value)} 
                         required
                       />
                       {formData.new_school_type === 'Mixed' && (
                           <select 
                             className="osa-select !py-2 w-32" 
                             value={h.gender}
                             onChange={(e) => handleDynamicHouseChange(i, 'gender', e.target.value)}
                           >
                              <option value="Boys">Boys</option>
                              <option value="Girls">Girls</option>
                              <option value="Mixed">Mixed</option>
                           </select>
                       )}
                       {i > 0 && <button type="button" onClick={() => setDynamicHouses(dynamicHouses.filter((_, idx) => idx !== i))} className="icon-btn text-danger"><X size={16}/></button>}
                    </div>
                 ))}
                 <button type="button" onClick={() => setDynamicHouses([...dynamicHouses, {name: "", gender: formData.new_school_type === 'Mixed' ? "Boys" : formData.new_school_type}])} className="text-sm text-brand-600 font-semibold ml-2 hover:underline">+ Add House</button>
              </div>
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
                          id="final_class"
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
                          label="Final Class"
                          name="final_class"
                          placeholder="e.g. 3A"
                          value={formData.final_class}
                          onChange={handleChange}
                          required
                      />
                  )}
              </div>

              {activeHouses.length > 0 ? (
                  <select 
                      id="house_name"
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
                      label="School House Name"
                      name="house_name"
                      placeholder="e.g. Casford"
                      value={formData.house_name}
                      onChange={handleChange}
                      required
                  />
              )}

              {/* Mixed School Gender Logic */}
              {!isNewSchoolFlow && formData.school_id && (() => {
                  const selSchool = schools.find(s => s.id === formData.school_id);
                  if (selSchool && selSchool.type === 'Mixed') {
                      return (
                          <Select 
                              label="Member Gender"
                              name="gender"
                              value={formData.gender}
                              onChange={handleChange}
                              options={[
                                  {label: "", value: ""},
                                  {label: "Male", value: "Male"},
                                  {label: "Female", value: "Female"},
                              ]}
                              required
                          />
                      );
                  }
                  return null;
              })()}

              {formData.year_group_id === 'new_yg' && (
                  <div className="grid grid-cols-2 gap-4 mt-2 bg-brand-50/50 p-4 rounded-xl border border-brand-200 col-span-full">
                      <div className="col-span-full mb-1">
                          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Create Year Group</label>
                      </div>
                      <Input 
                          label="Graduating Year"
                          name="new_yg_year"
                          placeholder="e.g. 2012"
                          value={formData.new_yg_year}
                          onChange={handleChange}
                          required
                      />
                      <Input 
                          label="Nickname"
                          name="new_yg_nickname"
                          placeholder="e.g. The Pioneers"
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
