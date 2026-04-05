import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Button, Card, Input, Select, Badge } from '../components/ui';
import { Mail, Lock, User, School, Hash, Key, X, Eye, EyeOff, Wand2, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMagicLink, setIsMagicLink] = useState(true);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isMagicLink) {
         await api.requestMagicLink(email);
         setMagicLinkSent(true);
      } else {
         await api.login(email, password);
         localStorage.setItem('osa_known_device', 'true');
         navigate('/app/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const isRecognized = localStorage.getItem('osa_known_device') === 'true';

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-ink-title mb-1 tracking-tight">
          {isRecognized ? "Welcome back" : "Welcome"}
        </h1>
        <p className="text-ink-muted text-[14px]">Sign in to your alumni community</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl mb-4 text-[13px] text-center font-medium">
          {error}
        </div>
      )}

      {magicLinkSent ? (
        <div className="text-center animate-fade-in">
           <div className="bg-school-tint p-6 rounded-xl mb-6 border shadow-sm" style={{ borderColor: 'var(--school-200)' }}>
               <Wand2 className="mx-auto mb-3" style={{ color: 'var(--school-primary)' }} size={38} />
               <p className="text-lg font-bold text-ink-title mb-1">Magic Link Sent!</p>
               <p className="text-[14px] text-ink-muted">Check your inbox for a secure login link.</p>
           </div>
           <Button variant="outline" className="w-full" onClick={() => { setMagicLinkSent(false); setIsMagicLink(false); }}>
              Back to Login
           </Button>
        </div>
      ) : (
        <form onSubmit={handleLogin} className="flex flex-col gap-4 animate-fade-in">
          <div className="relative">
            <User className="absolute left-3 top-9 text-ink-muted" size={18} />
            <Input 
              label="Email or Username"
              placeholder="Your email or username"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="[&>input]:pl-10"
              required
            />
          </div>
          
          {!isMagicLink && (
            <div className="relative">
              <Lock className="absolute left-3 top-9 text-ink-muted" size={18} />
              <Input 
                label="Password"
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="[&>input]:pl-10 pr-10"
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 p-1 text-ink-muted hover:text-ink-title transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          {!isMagicLink && (
            <div className="flex justify-between items-center px-1">
              <button 
                 type="button" 
                 onClick={() => setIsMagicLink(true)} 
                 className="text-[13px] text-ink-muted hover:text-ink-title hover:font-medium transition-all flex items-center gap-1.5"
              >
                 <Wand2 size={14}/> Passwordless Login
              </button>
              <Link to="/forgot-password" className="text-[13px] text-ink-muted hover:underline hover:text-ink-title transition-colors">
                Forgot Password?
              </Link>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? 'Please wait...' : (isMagicLink ? 'Send Magic Link' : 'Sign In')}
          </Button>

          {isMagicLink && (
            <div className="text-center mt-2">
              <button type="button" onClick={() => setIsMagicLink(false)} className="text-[13px] text-ink-muted hover:text-ink-title transition-colors">
                Actually, I want to use my password
              </button>
            </div>
          )}

          <div className="text-center mt-4 pt-4 border-t border-border-light text-[13px] text-ink-muted">
            Don't have an account? <Link to="/register" className="hover:underline font-semibold ml-1" style={{ color: 'var(--school-primary)' }}>Register here</Link>
          </div>
        </form>
      )}
    </div>
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
    old_students_full_name: '',
    old_students_short_name: '',
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

  const [isStaffReg, setIsStaffReg] = useState(false);
  const [staffAuthEmail, setStaffAuthEmail] = useState('');
  const [staffAuthPassed, setStaffAuthPassed] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // 'checking', 'available', 'taken'
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameModifiedManually, setUsernameModifiedManually] = useState(false);

  const navigate = useNavigate();

  // Auto-generate username from name
  useEffect(() => {
     if (usernameModifiedManually) return;
     if (!formData.name || formData.name.length < 3) return;
     
     const timeoutId = setTimeout(async () => {
         let baseUsername = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
         if (!baseUsername) return;
         
         setCheckingUsername(true);
         setUsernameStatus('checking');
         
         try {
             let res = await api.checkUsername(baseUsername);
             if (res.data?.available) {
                 setFormData(prev => ({ ...prev, username: baseUsername }));
                 setUsernameStatus('available');
                 setCheckingUsername(false);
                 return;
             }
             
             // If taken, try appending numbers
             for (let i = 1; i <= 5; i++) {
                 res = await api.checkUsername(baseUsername + i);
                 if (res.data?.available) {
                     setFormData(prev => ({ ...prev, username: baseUsername + i }));
                     setUsernameStatus('available');
                     break;
                 }
                 if (i === 5) setUsernameStatus('taken'); // Max retries
             }
         } catch(e) {
             console.log("Check username failed", e); 
         }
         
         setCheckingUsername(false);
     }, 600);
     
     return () => clearTimeout(timeoutId);
  }, [formData.name, usernameModifiedManually]);

  // Validation strictly for manual username input
  useEffect(() => {
     if (!usernameModifiedManually) return;
     if (!formData.username || formData.username.length < 3) {
         setUsernameStatus(null);
         return;
     }

     const timeoutId = setTimeout(async () => {
         setCheckingUsername(true);
         setUsernameStatus('checking');
         try {
            const res = await api.checkUsername(formData.username);
            setUsernameStatus(res.data?.available ? 'available' : 'taken');
         } catch(e) {
            console.log("Check username mapping failed", e);
         }
         setCheckingUsername(false);
     }, 600);
     
     return () => clearTimeout(timeoutId);
  }, [formData.username, usernameModifiedManually]);

  const handleUsernameChange = (e) => {
     setUsernameModifiedManually(true);
     setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }));
  };

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

    if (isStaffReg) {
       if (!staffAuthPassed) {
          if (staffAuthEmail === 'hello@menelekmakonnen.com') {
             setStaffAuthPassed(true);
             setError('');
             return;
          } else {
             setError("Unauthorized personnel email.");
             return;
          }
       }

       setLoading(true);
       try {
          await api.registerStaff(formData);
          navigate('/login'); // Return them to login to actually trigger the verification check
       } catch (err) {
          setError(err.message || 'Staff Registration failed');
       } finally {
          setLoading(false);
       }
       return;
    }

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
           {isStaffReg ? "ICUNI Labs Staff" : (isCustomDomain ? `Join ${tenantName}` : "Join OSA Network")}
        </h1>
        <p className="text-muted text-sm">
           {isStaffReg ? "Authorized personnel only" : (isNewSchoolFlow ? "Register a new school association as Super Admin" : "Create your portal account")}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isStaffReg && !staffAuthPassed ? (
           <div className="flex flex-col gap-4">
             <Input 
               label="Authorization Email"
               name="staffAuthEmail"
               type="email"
               placeholder="Enter authorized email"
               value={staffAuthEmail}
               onChange={(e) => setStaffAuthEmail(e.target.value)}
               required
             />
             <Button type="submit" disabled={loading} className="w-full">
               {loading ? 'Verifying...' : 'Verify Authorization'}
             </Button>
           </div>
        ) : (
           <>
              <Input 
                label="Full Name"
                name="name"
                placeholder="e.g. Jane Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
              
              <div className="relative">
                <Input 
                  label="Username"
                  name="username"
                  placeholder="e.g. janedoe"
                  value={formData.username}
                  onChange={handleUsernameChange}
                  required
                />
                {formData.username && formData.username.length >= 3 && (
                   <div className="absolute right-3 top-9 text-sm flex items-center">
                     {checkingUsername ? (
                       <Loader2 size={16} className="animate-spin text-muted" />
                     ) : usernameStatus === 'available' ? (
                       <CheckCircle2 size={16} className="text-green-500" />
                     ) : usernameStatus === 'taken' ? (
                       <XCircle size={16} className="text-red-500" />
                     ) : null}
                   </div>
                )}
              </div>
              
              <Input 
                label="Email Address"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />

              <div className="relative">
                <Input 
                  label="Create Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  className="pr-10"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 p-1 text-muted hover:text-forest transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
           </>
        )}

        {!isStaffReg && (
          <>
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
                         required={i === 0}
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
                         required={i === 0}
                       />
                       {i > 0 && <button type="button" onClick={() => setDynamicClasses(dynamicClasses.filter((_, idx) => idx !== i))} className="icon-btn text-danger"><X size={16}/></button>}
                    </div>
                 ))}
                 <button type="button" onClick={() => setDynamicClasses([...dynamicClasses, ""])} className="text-sm text-brand-600 font-semibold ml-2 hover:underline">+ Add Class</button>
              </div>

              <div className="mt-4">
                 <label className="text-sm font-semibold text-ink-title block mb-2 ml-1">Houses/Hostels</label>
                 {dynamicHouses.map((h, i) => (
                    <div key={`h-${i}`} className="flex gap-2 mb-2">
                       <input 
                         className="social-input" 
                         placeholder="e.g. Casford" 
                         value={h.name} 
                         onChange={(e) => handleDynamicHouseChange(i, 'name', e.target.value)} 
                         required={i === 0}
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
                 <button type="button" onClick={() => setDynamicHouses([...dynamicHouses, {name: "", gender: formData.new_school_type === 'Mixed' ? "Boys" : formData.new_school_type}])} className="text-sm text-brand-600 font-semibold ml-2 hover:underline">+ Add House/Hostel</button>
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
          </>
        )}
        
        {(!isStaffReg || staffAuthPassed) && (
           <Button type="submit" disabled={loading} className="w-full mt-2">
             {loading ? 'Creating Account...' : 'Register as Member'}
           </Button>
        )}

        <div className="text-center mt-4 text-sm text-muted">
          Already have an account? <Link to="/login" className="text-sage hover:underline font-medium">Sign in</Link>
          <div className="mt-2">
            <button 
              type="button" 
              onClick={() => { setIsStaffReg(!isStaffReg); setStaffAuthPassed(false); setError(''); }}
              className="text-xs text-brand-600 hover:underline"
              tabIndex="0"
            >
              {isStaffReg ? "Return to Member Registration" : "Staff"}
            </button>
          </div>
        </div>
      </form>
    </Card>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    setError('');
    setLoading(true);

    try {
      await api.requestPasswordReset(email);
      setStatus('If your email is registered, a password reset link has been sent. Please check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
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
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm text-center">
          {error}
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

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Sending...' : 'Send Link'}
        </Button>

        <div className="text-center mt-4 text-sm">
          <Link to="/login" className="text-sage hover:underline">Back to Login</Link>
        </div>
      </form>
    </Card>
  );
}

export function MagicLogin() {
  const [status, setStatus] = useState('Verifying your magic link...');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
     const verifyToken = async () => {
         const urlParams = new URLSearchParams(window.location.search);
         const token = urlParams.get('token');
         if (!token) {
             setError('No magic token provided in the URL.');
             setStatus('');
             return;
         }

         try {
             await api.completeMagicLinkLogin(token);
             localStorage.setItem('osa_known_device', 'true');
             setStatus('Login successful! Redirecting...');
             setTimeout(() => navigate('/app/dashboard'), 1500);
         } catch(e) {
             setError(e.message || 'Invalid or expired magic link.');
             setStatus('');
         }
     };

     verifyToken();
  }, [navigate]);

  return (
    <Card className="p-8 w-full max-w-md mx-auto text-center animate-fade-in mt-12">
       <Wand2 className="mx-auto mb-6 text-sage" size={48} />
       <h1 className="text-2xl font-heading text-forest mb-4">Magic Login</h1>
       
       {status && (
         <div className="flex flex-col items-center gap-3 text-muted mb-4">
           <Loader2 className="animate-spin text-forest mx-auto" size={24} />
           <p>{status}</p>
         </div>
       )}
       
       {error && (
         <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 shadow-sm">
           <XCircle className="mx-auto mb-2 opacity-80" size={32} />
           <p className="font-semibold">{error}</p>
         </div>
       )}

       {error && (
         <Button onClick={() => navigate('/login')} className="w-full" variant="outline">
            Return to Login
         </Button>
       )}
    </Card>
  );
}
