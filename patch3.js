const fs = require('fs');

let data = fs.readFileSync('frontend/src/pages/Cockpit.jsx', 'utf8');

const modalJSX = `      <Modal isOpen={isAddSchoolOpen} onClose={() => setIsAddSchoolOpen(false)} title="Forge Tenant Node">
        <form onSubmit={handleAddSchool} className="flex flex-col gap-4 mt-2 max-h-[70vh] overflow-y-auto px-1 pb-4">
          <div className="bg-brand-50 border border-brand-200 p-3 rounded-lg text-xs leading-snug text-brand-800 font-medium italic mb-2">
             Warning: Values here initialize the permanent DB Architecture for the target partition.
          </div>
          
          <h4 className="text-sm font-bold border-b pb-1 text-ink-title">1. Organization Topology</h4>
          <Input label="Short Code / Acronym" required value={newSchoolData.school_name} onChange={e => setNewSchoolData({...newSchoolData, school_name: e.target.value})} placeholder="e.g. AMOSA" />
          <Input label="Association Real Name" required value={newSchoolData.association_name} onChange={e => setNewSchoolData({...newSchoolData, association_name: e.target.value})} placeholder="e.g. Aggrey Memorial Old Students Association" />
          <Input label="Association Short Name (Alias)" value={newSchoolData.association_short_name} onChange={e => setNewSchoolData({...newSchoolData, association_short_name: e.target.value})} placeholder="e.g. Aggreymorians" />
          <Input label="Global Motto" value={newSchoolData.motto} onChange={e => setNewSchoolData({...newSchoolData, motto: e.target.value})} placeholder="e.g. Semper Fidelis" />
          
          <h4 className="text-sm font-bold border-b pb-1 text-ink-title mt-2">2. Network Schema (Comma Separated)</h4>
          <div className="grid grid-cols-2 gap-3">
             <Input label="Default Class Cohorts" value={newSchoolData.classes} onChange={e => setNewSchoolData({...newSchoolData, classes: e.target.value})} placeholder="Science, Arts, Business" />
             <Input label="Default Houses" value={newSchoolData.houses} onChange={e => setNewSchoolData({...newSchoolData, houses: e.target.value})} placeholder="Aggrey, Casely-Hayford, Ennin" />
          </div>

          <h4 className="text-sm font-bold border-b pb-1 text-ink-title mt-2">3. Initial Tenant Admin (T-4 User)</h4>
          <Input label="Initial Admin Name" required value={newSchoolData.admin_name} onChange={e => setNewSchoolData({...newSchoolData, admin_name: e.target.value})} placeholder="e.g. Systems Operator" />
          <Input label="Initial Admin Email" type="email" required value={newSchoolData.admin_email} onChange={e => setNewSchoolData({...newSchoolData, admin_email: e.target.value})} placeholder="e.g. initial@school.edu" />
          
          <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsAddSchoolOpen(false)}>Abort sequence</Button>
            <Button type="submit" disabled={submittingSchool}>{submittingSchool ? 'Constructing Node...' : 'Commit Protocol'}</Button>
          </div>
        </form>
      </Modal>`;

// Find the string to replace
const targetStr = `      <Modal isOpen={isAddSchoolOpen} onClose={() => setIsAddSchoolOpen(false)} title="Onboard New School">
        <form onSubmit={handleAddSchool} className="flex flex-col gap-4 mt-2">
          <Input label="School Name" required value={newSchoolData.school_name} onChange={e => setNewSchoolData({...newSchoolData, school_name: e.target.value})} placeholder="e.g. Aggrey Memorial SHS" />
          <div className="mb-0">
            <label className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">School Type</label>
            <select className="social-input" value={newSchoolData.school_type} onChange={e => setNewSchoolData({...newSchoolData, school_type: e.target.value})}>
              <option value="Mixed">Mixed</option>
              <option value="Boys">Boys</option>
              <option value="Girls">Girls</option>
            </select>
          </div>
          <Input label="Initial Admin Name" required value={newSchoolData.admin_name} onChange={e => setNewSchoolData({...newSchoolData, admin_name: e.target.value})} placeholder="e.g. Yaw Adjei" />
          <Input label="Initial Admin Email" type="email" required value={newSchoolData.admin_email} onChange={e => setNewSchoolData({...newSchoolData, admin_email: e.target.value})} placeholder="e.g. admin@school.edu" />
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddSchoolOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submittingSchool}>{submittingSchool ? 'Registering...' : 'Register School'}</Button>
          </div>
        </form>
      </Modal>`;

// Due to spaces differences, let's just use regex or match precisely exactly what git grep outputted
const regex = /<Modal isOpen={isAddSchoolOpen}[^]*?Register School'\}<\/Button>[\s\S]*?<\/form>[\s\S]*?<\/Modal>/;
data = data.replace(regex, modalJSX);

fs.writeFileSync('frontend/src/pages/Cockpit.jsx', data);
console.log('Patch 3 applied successfully.');
