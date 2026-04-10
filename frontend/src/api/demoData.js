// ══════════════════════════════════════════════════════════════════════
//  Demo Mode — Fake Data Layer for OSA
//  Intercepts all API calls when localStorage.osa_demo_mode === 'true'
//  Uses Aggrey Memorial as the demo school
// ══════════════════════════════════════════════════════════════════════

// ─── Demo Session ─────────────────────────────────
export const DEMO_TOKEN = 'demo_token_aggrey_2012';

const DEMO_ROLES = ['super_admin', 'admin', 'executive', 'member'];
export { DEMO_ROLES };

export const getDemoRole = () => localStorage.getItem('osa_demo_role') || 'super_admin';
export const setDemoRole = (role) => {
  localStorage.setItem('osa_demo_role', role);
  // Rebuild user with new role
  const user = buildDemoUser(role);
  localStorage.setItem('osa_current_user', JSON.stringify(user));
  // Ensure the demo token stays set (critical for auth check on reload)
  localStorage.setItem('osa_session_token', DEMO_TOKEN);
  // Clear cached theme so TenantContext re-applies on reload
  try { sessionStorage.removeItem('osa_theme'); } catch(e) {}
};

const buildDemoUser = (role) => ({
  id: 'demo_user_001',
  name: role === 'super_admin' ? 'Admin Kwame Asante' : role === 'admin' ? 'Abena Osei' : role === 'executive' ? 'Nana Ama Adjei' : 'Kofi Mensah',
  username: role === 'super_admin' ? 'kwameasante' : role === 'admin' ? 'abenaosei' : role === 'executive' ? 'nanaadjei' : 'kofimensah',
  email: 'demo@amosa-demo.com',
  role: role === 'super_admin' ? 'School Administrator' : role === 'admin' ? 'Admin' : role === 'executive' ? 'Executive' : 'Member',
  school_id: 'amosa_001',
  school_name: 'Aggrey Memorial',
  school_short_code: 'AMOSA',
  // School branding — feeds the Theme Engine via TenantContext
  school_primary_color: '#B067A1',   // Mauve — Aggrey Memorial primary
  school_secondary_color: '#F5C518', // Yellow — Aggrey Memorial secondary
  school_colours: 'Mauve, Yellow',   // Fallback color-name string
  school_logo: '',
  old_students_short_name: 'AMOSA',
  year_group_id: 'yg_2012',
  year_group: '2012',
  year_group_nickname: '2012 Year Group',
  house_name: 'Aggrey House',
  final_class: 'Science 1',
  gender: 'Male',
  profile_photo: '',
  verified: true,
  email_verified: true,
  is_staff: false,
  created_at: '2024-01-15',
  cheque_colour: '#B067A1',
  priv_email: 'all',
  priv_phone: 'all',
  priv_location: 'all',
  priv_profession: 'all',
  priv_linkedin: 'all',
  priv_bio: 'all',
});

export const DEMO_USER = buildDemoUser('super_admin');

// ─── School Data ──────────────────────────────────
const DEMO_SCHOOL = {
  id: 'amosa_001',
  name: 'Aggrey Memorial',
  short_code: 'AMOSA',
  motto: 'Semper Optimo Nitere',
  type: 'Mixed',
  brand_color: '#B067A1',
  secondary_color: '#F5C518',
  primary_color_hex: '#B067A1',
  secondary_color_hex: '#F5C518',
  logo_url: '',
  classes: JSON.stringify(['Science 1', 'Science 2', 'Arts 1', 'Business 1', 'General Arts']),
  houses: JSON.stringify([
    { name: 'Aggrey', gender: 'Boys' },
    { name: 'Nkrumah', gender: 'Boys' },
    { name: 'Victoria', gender: 'Girls' },
    { name: 'Casford', gender: 'Girls' },
  ]),
  colours: JSON.stringify(['Mauve', 'Yellow']),
  cheque_representation: 'Year Groups',
  created_at: '2023-06-01',
  status: 'Approved',
};

// ─── Members ──────────────────────────────────────
const DEMO_MEMBERS = [
  { id: 'm_001', name: 'Admin Kwame Asante', username: 'kwameasante', email: 'kwame@amosa.com', role: 'School Administrator', year_group: '2012', year_group_nickname: '2012 Year Group', house_name: 'Aggrey', final_class: 'Science 1', gender: 'Male', profile_pic: '', verified: true, profession: 'Software Engineer', location: 'Accra, Ghana', phone: '+233 24 000 0001' },
  { id: 'm_002', name: 'Abena Osei', username: 'abenaosei', email: 'abena@amosa.com', role: 'Admin', year_group: '2012', year_group_nickname: '2012 Year Group', house_name: 'Victoria', final_class: 'Arts 1', gender: 'Female', profile_pic: '', verified: true, profession: 'Lawyer', location: 'Kumasi, Ghana', phone: '+233 24 000 0002' },
  { id: 'm_003', name: 'Nana Ama Adjei', username: 'nanaadjei', email: 'nana@amosa.com', role: 'Executive', year_group: '2012', year_group_nickname: '2012 Year Group', house_name: 'Casford', final_class: 'Business 1', gender: 'Female', profile_pic: '', verified: true, profession: 'Accountant', location: 'Tema, Ghana', phone: '+233 24 000 0003' },
  { id: 'm_004', name: 'Kofi Mensah', username: 'kofimensah', email: 'kofi@amosa.com', role: 'Member', year_group: '2012', year_group_nickname: '2012 Year Group', house_name: 'Nkrumah', final_class: 'Science 1', gender: 'Male', profile_pic: '', verified: true, profession: 'Doctor', location: 'Accra, Ghana', phone: '+233 24 000 0004' },
  { id: 'm_005', name: 'Esi Mensah', username: 'esimensah', email: 'esi@amosa.com', role: 'Member', year_group: '2012', year_group_nickname: '2012 Year Group', house_name: 'Victoria', final_class: 'General Arts', gender: 'Female', profile_pic: '', verified: true, profession: 'Teacher', location: 'Cape Coast, Ghana' },
  { id: 'm_006', name: 'Yaw Boateng', username: 'yawboat', email: 'yaw@amosa.com', role: 'Member', year_group: '2013', year_group_nickname: '2013 Year Group', house_name: 'Aggrey', final_class: 'Science 2', gender: 'Male', profile_pic: '', verified: true, profession: 'Engineer', location: 'Takoradi, Ghana' },
  { id: 'm_007', name: 'Adjoa Forson', username: 'adjoaforson', email: 'adjoa@amosa.com', role: 'Member', year_group: '2014', year_group_nickname: '2014 Year Group', house_name: 'Casford', final_class: 'Arts 1', gender: 'Female', profile_pic: '', verified: true, profession: 'Journalist', location: 'Accra, Ghana' },
  { id: 'm_008', name: 'Samuel Oppong', username: 'samoppong', email: 'samuel@amosa.com', role: 'Executive', year_group: '2013', year_group_nickname: '2013 Year Group', house_name: 'Nkrumah', final_class: 'Business 1', gender: 'Male', profile_pic: '', verified: true, profession: 'Banker', location: 'Accra, Ghana' },
  { id: 'm_009', name: 'Akua Sarpong', username: 'akuasar', email: 'akua@amosa.com', role: 'Admin', year_group: '2013', year_group_nickname: '2013 Year Group', house_name: 'Victoria', final_class: 'Science 1', gender: 'Female', profile_pic: '', verified: true, profession: 'Pharmacist', location: 'Kumasi, Ghana' },
  { id: 'm_010', name: 'Fiifi Acquah', username: 'fiifiacq', email: 'fiifi@amosa.com', role: 'Member', year_group: '2014', year_group_nickname: '2014 Year Group', house_name: 'Aggrey', final_class: 'General Arts', gender: 'Male', profile_pic: '', verified: true, profession: 'Architect', location: 'Accra, Ghana' },
  { id: 'm_011', name: 'Ewurabena Quansah', username: 'ewura', email: 'ewura@amosa.com', role: 'Member', year_group: '2012', year_group_nickname: '2012 Year Group', house_name: 'Casford', final_class: 'Science 2', gender: 'Female', profile_pic: '', verified: true, profession: 'Nurse', location: 'Tamale, Ghana' },
  { id: 'm_012', name: 'Michael Darko', username: 'mikedarko', email: 'mike@amosa.com', role: 'Member', year_group: '2015', year_group_nickname: '2015 Year Group', house_name: 'Nkrumah', final_class: 'Arts 1', gender: 'Male', profile_pic: '', verified: true, profession: 'Entrepreneur', location: 'Accra, Ghana' },
  { id: 'm_013', name: 'Priscilla Amankwah', username: 'prisam', email: 'pris@amosa.com', role: 'Member', year_group: '2015', year_group_nickname: '2015 Year Group', house_name: 'Victoria', final_class: 'Business 1', gender: 'Female', profile_pic: '', verified: true, profession: 'Designer', location: 'Accra, Ghana' },
  { id: 'm_014', name: 'Emmanuel Tetteh', username: 'emantet', email: 'eman@amosa.com', role: 'Member', year_group: '2012', year_group_nickname: '2012 Year Group', house_name: 'Aggrey', final_class: 'Science 1', gender: 'Male', profile_pic: '', verified: true, profession: 'Pilot', location: 'Kotoka, Ghana' },
  { id: 'm_015', name: 'Charity Asante', username: 'charitya', email: 'charity@amosa.com', role: 'Member', year_group: '2014', year_group_nickname: '2014 Year Group', house_name: 'Casford', final_class: 'General Arts', gender: 'Female', profile_pic: '', verified: true, profession: 'Marketing Manager', location: 'Accra, Ghana' },
  { id: 'm_016', name: 'Daniel Kwarteng', username: 'dankwart', email: 'daniel@amosa.com', role: 'Member', year_group: '2013', year_group_nickname: '2013 Year Group', house_name: 'Nkrumah', final_class: 'Science 1', gender: 'Male', profile_pic: '', verified: true, profession: 'Lecturer', location: 'Cape Coast, Ghana' },
  { id: 'm_017', name: 'Gifty Acheampong', username: 'giftyach', email: 'gifty@amosa.com', role: 'Member', year_group: '2015', year_group_nickname: '2015 Year Group', house_name: 'Victoria', final_class: 'Science 2', gender: 'Female', profile_pic: '', verified: true, profession: 'Dentist', location: 'Kumasi, Ghana' },
  { id: 'm_018', name: 'Patrick Owusu', username: 'patowusu', email: 'patrick@amosa.com', role: 'Member', year_group: '2012', year_group_nickname: '2012 Year Group', house_name: 'Aggrey', final_class: 'Business 1', gender: 'Male', profile_pic: '', verified: true, profession: 'Trader', location: 'Accra, Ghana' },
];

// ─── Year Groups ──────────────────────────────────
const DEMO_YEAR_GROUPS = [
  { id: 'yg_2012', year: '2012', nickname: '2012 Year Group', member_count: 68, cheque_colour: '#B067A1', school: 'Aggrey Memorial' },
  { id: 'yg_2013', year: '2013', nickname: '2013 Year Group', member_count: 52, cheque_colour: '#D97706', school: 'Aggrey Memorial' },
  { id: 'yg_2014', year: '2014', nickname: '2014 Year Group', member_count: 45, cheque_colour: '#6366F1', school: 'Aggrey Memorial' },
  { id: 'yg_2015', year: '2015', nickname: '2015 Year Group', member_count: 33, cheque_colour: '#0891B2', school: 'Aggrey Memorial' },
];

// ─── Dashboard ────────────────────────────────────
const DEMO_DASHBOARD = {
  stats: {
    ygMembersCount: 198,
    activeCampaignsCount: 3,
    upcomingEventsCount: 5,
    pendingPostsCount: 2,
    total_raised: 38500,
  },
  recent_activity: [
    { type: 'member_joined', text: 'Charity Asante joined the network', time: '2 hours ago' },
    { type: 'donation', text: 'GHS 500 donated to Campus Development Fund', time: '5 hours ago' },
    { type: 'event_created', text: '10th Anniversary Reunion event published', time: '1 day ago' },
    { type: 'newsletter', text: 'Monthly digest sent to 165 members', time: '3 days ago' },
    { type: 'member_joined', text: 'Michael Darko verified their account', time: '5 days ago' },
  ],
  announcements: [
    { id: 'ann_1', title: 'Aggrey Memorial 10th Anniversary Reunion', body: 'The planning committee for the 10th Anniversary Reunion has been formed. All year group representatives are invited to the first meeting.', author: 'Admin Kwame Asante', date: '2026-03-28', pinned: true },
    { id: 'ann_2', title: 'Annual Dues Collection Open', body: 'Annual dues collection for AMOSA is now open. Please make payments via the Fundraising module.', author: 'Abena Osei', date: '2026-03-20' },
  ],
  recentPosts: [
    { id: 'post_1', title: 'Aggrey Memorial 10th Anniversary Reunion - Save the Date!', category: 'Announcement', content: 'Dear Fellow Alumni, We are thrilled to announce the 10th Anniversary Reunion. The event will be held in June 2026. Mark your calendars and prepare for a weekend of celebration!', author_name: 'Admin Kwame Asante', submission_date: '2026-03-28' },
    { id: 'post_2', title: 'My Journey from Aggrey Memorial to Silicon Valley', category: 'Professional', content: "After graduating in 2012, I embarked on an incredible journey that took me from Ghana to Silicon Valley. I'm now a Senior Software Engineer at a leading tech company.", author_name: 'Kofi Mensah', submission_date: '2026-03-15' },
    { id: 'post_3', title: 'Scholarship Fund Update', category: 'Announcement', content: 'Thanks to generous contributions, we have fully funded 3 scholarships for the 2026 academic year. Each scholarship covers tuition, books and feeding for one student.', author_name: 'Abena Osei', submission_date: '2026-03-05' },
  ],
};

// ─── Group Settings ───────────────────────────────
const DEMO_GROUP_SETTINGS = {
  name: 'AMOSA — Class of 2012',
  description: 'Aggrey Memorial Old Students Association, Class of 2012 — The Pioneers',
  school_name: 'Aggrey Memorial',
  avatar_url: '',
  brand_color: '#B067A1',
  allow_member_posts: true,
  require_post_approval: true,
  allow_gallery_uploads: true,
};

// ─── Posts / Newsletter ───────────────────────────
const DEMO_POSTS = [
  { id: 'post_1', title: 'Aggrey Memorial 10th Anniversary Reunion - Save the Date!', category: 'Announcement', content: 'Dear Fellow Alumni, We are thrilled to announce the 10th Anniversary Reunion of Aggrey Memorial Old Students Association. The event will be held in June 2026. Mark your calendars and prepare for a weekend of celebration, networking, and reconnecting with old friends. More details to follow soon!', author_id: 'm_001', author_name: 'Admin Kwame Asante', submission_date: '2026-03-28', status: 'Approved', newsletter_month: '2026-03-01', pinned: true },
  { id: 'post_2', title: 'My Journey from Aggrey Memorial to Silicon Valley', category: 'Professional', content: 'After graduating from Aggrey Memorial in 2012, I embarked on an incredible journey that took me from Ghana to Silicon Valley. I\'m now a Senior Software Engineer at a leading tech company. I owe so much of my success to the values and discipline instilled in me at AMOSA.', author_id: 'm_004', author_name: 'Kofi Mensah', submission_date: '2026-03-15', status: 'Approved', newsletter_month: '2026-03-01' },
  { id: 'post_3', title: 'Scholarship Fund Update', category: 'Announcement', content: 'Thanks to generous contributions from the Class of 2012, we have fully funded 3 scholarships for the 2026 academic year. Each scholarship covers tuition, books and feeding for one student.', author_id: 'm_002', author_name: 'Abena Osei', submission_date: '2026-03-05', status: 'Approved', newsletter_month: '2026-03-01' },
  { id: 'post_4', title: 'Sports Day Throwback', category: 'Social', content: 'Remember the epic inter-house sports competition of 2011? Aggrey House swept the track events while Victoria dominated the field events! Share your favourite sports day memories in the comments.', author_id: 'm_008', author_name: 'Samuel Oppong', submission_date: '2026-02-20', status: 'Approved', newsletter_month: '' },
  { id: 'post_5', title: 'Career Mentorship Initiative', category: 'Professional', content: 'We are launching a mentorship programme connecting senior alumni with recent graduates. If you are interested in mentoring or being mentored, please register via the Events section.', author_id: 'm_003', author_name: 'Nana Ama Adjei', submission_date: '2026-02-10', status: 'Pending', newsletter_month: '' },
];

// ─── Events ───────────────────────────────────────
const DEMO_EVENTS = [
  { id: 'evt_1', title: '10th Anniversary Reunion', description: 'Annual reunion celebration on campus. Includes dinner, awards ceremony, and class reunions across all year groups.', date: '2026-06-20', time: '14:00', location: 'Aggrey Memorial School Campus', type: 'reunion', status: 'upcoming', rsvp_count: 85, capacity: 200 },
  { id: 'evt_2', title: 'Quarterly Virtual Meetup', description: 'Online catch-up session for all AMOSA members. Updates on projects and upcoming initiatives.', date: '2026-04-15', time: '19:00', location: 'Zoom', type: 'meeting', status: 'upcoming', rsvp_count: 45, capacity: 100 },
  { id: 'evt_3', title: 'Career Mentorship Workshop', description: 'Senior alumni share career insights with recent graduates. Networking session included.', date: '2026-05-10', time: '10:00', location: 'Accra City Hotel', type: 'workshop', status: 'upcoming', rsvp_count: 32, capacity: 50 },
  { id: 'evt_4', title: 'Independence Day Dinner 2025', description: 'Celebration dinner marking Ghana\'s independence. Guest speaker: Dr. Ama Serwaa.', date: '2025-03-06', time: '18:00', location: 'Kempinski Hotel, Accra', type: 'dinner', status: 'completed', rsvp_count: 120, capacity: 150 },
];

// ─── Fundraising ──────────────────────────────────
const DEMO_CAMPAIGNS = [
  { id: 'camp_1', title: 'Campus Development Fund', description: 'Building a new computer lab for current Aggrey Memorial students.', goal: 60000, raised: 38500, currency: 'GHS', status: 'active', donors: 78, start_date: '2026-01-01', end_date: '2026-12-31', created_by: 'Admin Kwame Asante' },
  { id: 'camp_2', title: 'Scholarship Fund 2026', description: 'Sponsoring bright students who cannot afford tuition.', goal: 25000, raised: 25000, currency: 'GHS', status: 'completed', donors: 42, start_date: '2025-09-01', end_date: '2026-03-01', created_by: 'Abena Osei' },
  { id: 'camp_3', title: 'Annual Dues Collection', description: 'Yearly AMOSA membership dues for association operations.', goal: 30000, raised: 18500, currency: 'GHS', status: 'active', donors: 165, start_date: '2026-01-01', end_date: '2026-06-30', created_by: 'Nana Ama Adjei' },
];

const DEMO_DONATIONS = [
  { id: 'don_1', donor_name: 'Admin Kwame Asante', amount: 1000, currency: 'GHS', campaign_id: 'camp_1', date: '2026-03-25', method: 'MoMo' },
  { id: 'don_2', donor_name: 'Esi Mensah', amount: 500, currency: 'GHS', campaign_id: 'camp_1', date: '2026-03-20', method: 'Bank Transfer' },
  { id: 'don_3', donor_name: 'Yaw Boateng', amount: 200, currency: 'GHS', campaign_id: 'camp_3', date: '2026-03-18', method: 'MoMo' },
  { id: 'don_4', donor_name: 'Nana Ama Adjei', amount: 2000, currency: 'GHS', campaign_id: 'camp_2', date: '2026-02-28', method: 'Card' },
  { id: 'don_5', donor_name: 'Fiifi Acquah', amount: 150, currency: 'GHS', campaign_id: 'camp_3', date: '2026-03-15', method: 'MoMo' },
];

// ─── Board Messages ───────────────────────────────
const DEMO_BOARD_MESSAGES = [
  { id: 'msg_1', group_id: '', author_id: 'm_001', author_name: 'Admin Kwame Asante', content: 'Excited for the upcoming 10th Anniversary Reunion! Can\'t wait to see all my old classmates. Who else is planning to attend? Drop a comment below! 🎉', comments: [{ author_id: 'm_004', author_name: 'Kofi Mensah', content: "I'll definitely be there! Looking forward to reconnecting with everyone 🎊", timestamp: '2026-03-25T10:00:00Z' }], reactions: [{ emoji: '😀', count: 5 }], timestamp: '2026-03-25T10:00:00Z', school: 'amosa_001' },
  { id: 'msg_2', group_id: '', author_id: 'm_003', author_name: 'Nana Ama Adjei', content: 'The scholarship fund has reached its target! Thank you to everyone who contributed. 3 students will benefit this year.', comments: [], reactions: [{ emoji: '❤️', count: 12 }], timestamp: '2026-03-20T14:00:00Z', school: 'amosa_001' },
  { id: 'msg_3', group_id: '', author_id: 'm_008', author_name: 'Samuel Oppong', content: 'Who remembers Mr. Mensah\'s chemistry class? Those were wild times 😂', comments: [{ author_id: 'm_005', author_name: 'Esi Mensah', content: 'How could anyone forget! The volcano experiment that went wrong 🌋', timestamp: '2026-03-18T16:00:00Z' }, { author_id: 'm_006', author_name: 'Yaw Boateng', content: "Classic! Best teacher ever though", timestamp: '2026-03-18T17:00:00Z' }], reactions: [{ emoji: '😂', count: 8 }], timestamp: '2026-03-18T15:00:00Z', school: 'amosa_001' },
  { id: 'msg_4', group_id: '', author_id: 'm_002', author_name: 'Abena Osei', content: 'Reminder: Annual dues are now open. Please make your contributions through the Fundraising page. 💰', comments: [], reactions: [], timestamp: '2026-03-15T09:00:00Z', school: 'amosa_001' },
];

// ─── Gallery / Albums ─────────────────────────────
const DEMO_ALBUMS = [
  { id: 'alb_1', group_id: '', name: '10th Anniversary Reunion 2026', description: 'Photos from our 10th Anniversary Reunion held in June 2026. Memories shared by AMOSA members.', created_by_id: 'm_001', created_by_name: 'Admin Kwame Asante', timestamp: '2026-03-15T10:00:00Z', school: 'amosa_001', photo_count: 24 },
  { id: 'alb_2', group_id: 'yg_2012', name: 'Class of 2012 Graduation', description: 'Graduation ceremony and celebrations.', created_by_id: 'm_003', created_by_name: 'Nana Ama Adjei', timestamp: '2025-12-22T10:00:00Z', school: 'amosa_001', photo_count: 45 },
  { id: 'alb_3', group_id: '', name: 'Sports Day 2011 Throwback', description: 'The legendary inter-house competition photos.', created_by_id: 'm_008', created_by_name: 'Samuel Oppong', timestamp: '2025-07-20T10:00:00Z', school: 'amosa_001', photo_count: 30 },
];

const DEMO_GALLERY_ITEMS = [];

// ─── Support Tickets ──────────────────────────────
const DEMO_TICKETS = [
  { id: 'tkt_1', subject: 'Cannot update profile photo', category: 'Bug', author_id: 'm_005', author_name: 'Esi Mensah', status: 'Open', priority: 'Medium', created_at: '2026-03-27', messages: [{ author: 'Esi Mensah', content: 'I keep getting an error when trying to upload a new profile photo.', timestamp: '2026-03-27' }] },
  { id: 'tkt_2', subject: 'Need help with dues payment', category: 'Payment', author_id: 'm_010', author_name: 'Fiifi Acquah', status: 'Resolved', priority: 'Low', created_at: '2026-03-20', messages: [{ author: 'Fiifi Acquah', content: 'How do I pay my annual dues?', timestamp: '2026-03-20' }] },
];

// ─── Profile ──────────────────────────────────────
const buildDemoProfile = (role) => ({
  ...buildDemoUser(role),
  phone: '+233 24 123 4567',
  location: 'Accra, Ghana',
  profession: 'Software Engineer',
  company: 'Tech Solutions Ltd',
  bio: 'Passionate about using technology to connect alumni communities. Proud Aggrey Memorial old student. Working to bridge the gap between generations.',
  linkedin: 'https://linkedin.com/in/demouser',
  date_joined: '2024-01-15',
  last_active: '2026-04-08',
});

// ─── Feature Flags ────────────────────────────────
const DEMO_FEATURE_FLAGS = {
  gallery_enabled: true,
  board_enabled: true,
  fundraising_enabled: true,
  events_enabled: true,
  newsletter_enabled: true,
  support_enabled: true,
  directory_enabled: true,
};

// ══════════════════════════════════════════════════════════════════════
//  Demo API Interceptor — maps action names to fake responses
// ══════════════════════════════════════════════════════════════════════

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms + Math.random() * 300));

export async function demoApiRequest(action, payload) {
  await delay();

  const role = getDemoRole();
  const user = buildDemoUser(role);

  const handlers = {
    // ── Auth ──
    login:              () => ({ token: DEMO_TOKEN, user }),
    sendOTP:            () => ({ message: 'Demo: OTP sent to demo@amosa-demo.com' }),
    verifyOTP:          () => ({ token: DEMO_TOKEN, user }),
    pinLogin:           () => ({ token: DEMO_TOKEN, user }),
    checkHasPin:        () => ({ hasPin: true }),
    setPin:             () => ({ message: 'PIN set' }),
    deletePin:          () => ({ message: 'PIN deleted' }),
    checkUsername:       () => ({ available: true }),
    getSession:         () => ({ token: DEMO_TOKEN, user }),

    // ── Dashboard ──
    getDashboard:       () => DEMO_DASHBOARD,

    // ── Group Settings ──
    getGroupSettings:   () => DEMO_GROUP_SETTINGS,
    saveGroupSettings:  () => ({ ...DEMO_GROUP_SETTINGS, ...payload }),

    // ── Profile ──
    getProfile:         () => buildDemoProfile(role),
    updateProfile:      () => ({ ...buildDemoProfile(role), ...payload }),

    // ── Members / Directory ──
    getMembers:         () => DEMO_MEMBERS,
    getDirectory:       () => DEMO_MEMBERS,
    getMemberProfile:   () => DEMO_MEMBERS.find(m => m.id === payload?.id) || DEMO_MEMBERS[0],

    // ── Newsletter / Posts ──
    getPosts:           () => DEMO_POSTS,
    getPost:            () => DEMO_POSTS.find(p => p.id === payload?.id) || DEMO_POSTS[0],
    createPost:         () => ({ id: 'post_new', ...payload, submission_date: new Date().toISOString(), status: 'Pending' }),
    updatePost:         () => ({ ...DEMO_POSTS[0], ...payload }),
    deletePost:         () => ({ message: 'Post deleted' }),
    approvePost:        () => ({ message: 'Post approved' }),
    rejectPost:         () => ({ message: 'Post rejected' }),

    // ── Events ──
    getEvents:          () => DEMO_EVENTS,
    getEvent:           () => DEMO_EVENTS.find(e => e.id === payload?.id) || DEMO_EVENTS[0],
    createEvent:        () => ({ id: 'evt_new', ...payload }),
    updateEvent:        () => ({ ...DEMO_EVENTS[0], ...payload }),
    deleteEvent:        () => ({ message: 'Event deleted' }),
    rsvpEvent:          () => ({ message: 'RSVP confirmed' }),
    getRSVPs:           () => DEMO_MEMBERS.slice(0, 5).map(m => ({ member_id: m.id, member_name: m.name, status: 'Going' })),

    // ── Fundraising ──
    getCampaigns:       () => DEMO_CAMPAIGNS,
    getCampaign:        () => DEMO_CAMPAIGNS.find(c => c.id === payload?.id) || DEMO_CAMPAIGNS[0],
    getDonations:       () => DEMO_DONATIONS,
    createCampaign:     () => ({ id: 'camp_new', ...payload }),
    makeDonation:       () => ({ id: 'don_new', ...payload }),
    getPendingPledges:  () => [],

    // ── Board ──
    getBoardMessages:   () => DEMO_BOARD_MESSAGES,
    postBoardMessage:   () => ({ id: 'msg_new', ...payload, timestamp: new Date().toISOString(), comments: [], reactions: [] }),
    addBoardComment:    () => ({ message: 'Comment added' }),
    reactBoardMessage:  () => ({ message: 'Reaction added' }),
    deleteBoardMessage: () => ({ message: 'Message deleted' }),

    // ── Gallery ──
    getAlbums:          () => DEMO_ALBUMS,
    getAlbum:           () => DEMO_ALBUMS[0],
    getGalleryItems:    () => DEMO_GALLERY_ITEMS,
    createAlbum:        () => ({ id: 'alb_new', ...payload }),
    uploadPhoto:        () => ({ id: 'photo_new', url: '' }),
    deleteAlbum:        () => ({ message: 'Album deleted' }),
    deleteGalleryItem:  () => ({ message: 'Photo deleted' }),

    // ── Support ──
    getTickets:         () => DEMO_TICKETS,
    getTicket:          () => DEMO_TICKETS[0],
    createTicket:       () => ({ id: 'tkt_new', ...payload }),
    replyTicket:        () => ({ message: 'Reply sent' }),

    // ── Schools / Registration ──
    getSchools:         () => [DEMO_SCHOOL],
    getYearGroups:      () => DEMO_YEAR_GROUPS,
    getYearGroupsList:  () => DEMO_YEAR_GROUPS,

    // ── Admin ──
    getAdminDashboard:  () => ({
      pending_members: 3,
      total_members: DEMO_MEMBERS.length,
      roles_breakdown: {
        'School Administrator': DEMO_MEMBERS.filter(m => m.role === 'School Administrator').length,
        'Admin': DEMO_MEMBERS.filter(m => m.role === 'Admin').length,
        'Executive': DEMO_MEMBERS.filter(m => m.role === 'Executive').length,
        'Member': DEMO_MEMBERS.filter(m => m.role === 'Member').length,
      },
    }),
    getRoles:           () => DEMO_MEMBERS.map(m => ({ id: m.id, name: m.name, role: m.role })),
    updateRole:         () => ({ message: 'Role updated' }),
    approveMember:      () => ({ message: 'Member approved' }),
    rejectMember:       () => ({ message: 'Member rejected' }),

    // ── Super Admin / Cockpit ──
    getSystemOverview:  () => ({
      school: DEMO_SCHOOL,
      year_groups: DEMO_YEAR_GROUPS,
      total_members: DEMO_MEMBERS.length,
      total_posts: DEMO_POSTS.length,
      total_events: DEMO_EVENTS.length,
      total_campaigns: DEMO_CAMPAIGNS.length,
    }),
    getStaffRoster:     () => [],
    getSheetDataRaw:    () => [],
    updateSchool:       () => ({ ...DEMO_SCHOOL, ...payload }),
    createYearGroup:    () => ({ id: 'yg_new', ...payload }),
    updateYearGroup:    () => ({ message: 'Year group updated' }),

    // ── Settings ──
    getSettings:        () => ({ theme: 'auto', notifications: true, newsletter_frequency: 'weekly' }),
    updateSettings:     () => ({ message: 'Settings updated' }),
    getFeatureFlags:    () => DEMO_FEATURE_FLAGS,

    // ── Password ──
    changePassword:     () => ({ message: 'Password changed (demo)' }),
    resetPassword:      () => ({ message: 'Reset email sent (demo)' }),

    // ── Verification ──
    verifyEmail:        () => ({ message: 'Email verified (demo)' }),
    resendVerification: () => ({ message: 'Verification sent (demo)' }),

    // ── Group Avatar ──
    updateGroupAvatar:  () => ({ message: 'Avatar updated (demo)' }),
  };

  const handler = handlers[action];
  if (handler) {
    return handler();
  }

  console.warn(`[DEMO] No handler for action: ${action}`);
  return { message: `Demo: ${action} completed` };
}

// ─── Demo Mode Utilities ──────────────────────────
export function isDemoMode() {
  return localStorage.getItem('osa_demo_mode') === 'true';
}

export function exitDemoMode() {
  localStorage.removeItem('osa_demo_mode');
  localStorage.removeItem('osa_demo_role');
  localStorage.removeItem('osa_session_token');
  localStorage.removeItem('osa_current_user');
  document.title = 'OSA Directory';
  window.location.href = '/login';
}
