// 1. ตั้งค่าการเชื่อมต่อ Supabase
const SUPABASE_URL = 'https://xwhhhnabjbgfupalbchv.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_q2GTFByx0fdeqa0orJXpsQ_yTPDaHiY'; 

// สร้าง Client โดยใช้ชื่อ supabaseClient
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// ดึง User ปัจจุบัน
async function getCurrentUser() {
  if (!supabaseClient) return null;
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// ออกจากระบบ
async function logout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

// ดึงโปรไฟล์นักศึกษา
async function loadStudentProfile() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }

  const { data: profile } = await supabaseClient
    .from('student_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (profile) {
    const profileElement = document.getElementById('profile-info');
    if (profileElement) {
      profileElement.innerHTML = `
        <div class="flex items-center justify-between bg-emerald-50 p-3 rounded-lg border border-emerald-200">
          <div class="flex items-center space-x-3">
            <div class="bg-emerald-600 text-white font-bold w-10 h-10 rounded-full flex items-center justify-center">
              ${profile.full_name.charAt(0)}
            </div>
            <div>
              <h4 class="font-bold text-gray-800">${profile.full_name}</h4>
              <p class="text-xs text-gray-600">${profile.major} | ชั้นปีที่ ${profile.study_year} | GPA: <b class="text-emerald-700">${profile.gpa}</b></p>
            </div>
          </div>
          <button onclick="logout()" class="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-200 font-semibold">
            ออกจากระบบ
          </button>
        </div>
      `;
    }
    return profile;
  }
  return null;
}

// ดึงรายการทุนการศึกษา
async function fetchScholarships() {
  const student = await loadStudentProfile();
  const container = document.getElementById('scholarship-list');
  if (!container || !supabaseClient) return;

  const { data: scholarships, error } = await supabaseClient
    .from('scholarships')
    .select(`
      *,
      scholarship_requirements(*),
      scholarship_eligibility(*)
    `)
    .order('created_at', { ascending: false });

  if (error || !scholarships) {
    container.innerHTML = `<p class="text-red-500 text-sm">เกิดข้อผิดพลาดในการโหลดข้อมูลทุน (โปรดตรวจสอบ API Key)</p>`;
    return;
  }

  if (scholarships.length === 0) {
    container.innerHTML = `<p class="text-gray-400 text-sm">ยังไม่มีรายการทุนการศึกษาในระบบ</p>`;
    return;
  }

  container.innerHTML = scholarships.map(item => {
    const gpaCondition = item.scholarship_eligibility ? item.scholarship_eligibility.find(e => e.condition_type === 'GPA_MIN') : null;
    const minGpa = gpaCondition ? parseFloat(gpaCondition.condition_value) : 0;
    const isEligible = student ? student.gpa >= minGpa : true;
    const reqs = item.scholarship_requirements || [];

    return `
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
        <div class="flex justify-between items-start">
          <div>
            <span class="text-xs font-semibold px-2 py-0.5 rounded ${isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
              ${isEligible ? '✓ สิทธิ์สมัครผ่าน' : '⚠️ เกรดไม่ถึงเกณฑ์'}
            </span>
            <h3 class="text-lg font-bold text-gray-900 mt-1">${item.title}</h3>
          </div>
          <span class="text-xs px-2.5 py-1 rounded-full font-bold ${item.status.toLowerCase() === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
            ${item.status}
          </span>
        </div>

        <p class="text-sm text-gray-600 mt-2">${item.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>

        <div class="mt-3 bg-gray-50 p-3 rounded-lg text-xs">
          <p class="font-bold text-gray-700 mb-1">📄 เอกสารที่ต้องเตรียม (${reqs.length} รายการ):</p>
          <ul class="list-disc list-inside text-gray-600 space-y-0.5">
            ${reqs.map(req => `<li><b>${req.document_name}</b>: ${req.description}</li>`).join('') || '<li>ไม่ระบุเอกสาร</li>'}
          </ul>
        </div>

        <div class="mt-4 flex justify-between items-center pt-3 border-t text-sm">
          <div>
            <span class="text-gray-500">ผู้จัดสรร:</span> <span class="font-medium">${item.provider}</span> | 
            <span class="text-emerald-600 font-bold">฿${Number(item.amount).toLocaleString()}</span>
          </div>
          <button onclick="saveScholarship('${item.id}')" ${!isEligible ? 'disabled' : ''} 
            class="px-4 py-2 text-xs font-bold rounded-lg transition ${isEligible ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}">
            ⭐ บันทึกและเริ่มเช็คลิสต์
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// บันทึกทุน
async function saveScholarship(scholarshipId) {
  const user = await getCurrentUser();
  if (!user || !supabaseClient) return;

  const { data: saved, error } = await supabaseClient
    .from('saved_scholarships')
    .insert([{ user_id: user.id, scholarship_id: scholarshipId }])
    .select()
    .single();

  if (error) {
    alert('คุณได้บันทึกทุนนี้ไว้แล้ว หรือเกิดข้อผิดพลาด');
    return;
  }

  const { data: requirements } = await supabaseClient
    .from('scholarship_requirements')
    .select('id')
    .eq('scholarship_id', scholarshipId);

  if (requirements && requirements.length > 0) {
    const checklistPayload = requirements.map(req => ({
      saved_id: saved.id,
      requirement_id: req.id,
      completed: false
    }));
    await supabaseClient.from('checklist_items').insert(checklistPayload);
  }

  alert('บันทึกทุนสำเร็จ!');
  fetchSavedScholarships();
}

// ดึงทุนที่บันทึกไว้
async function fetchSavedScholarships() {
  const user = await getCurrentUser();
  const container = document.getElementById('saved-list');
  if (!user || !container || !supabaseClient) return;

  const { data: savedList } = await supabaseClient
    .from('saved_scholarships')
    .select(`
      id,
      scholarships ( title, deadline ),
      checklist_items (
        id,
        completed,
        scholarship_requirements ( document_name )
      )
    `)
    .eq('user_id', user.id);

  if (!savedList || savedList.length === 0) {
    container.innerHTML = `<p class="text-sm text-gray-400">ยังไม่มีรายการที่บันทึกไว้</p>`;
    return;
  }

  container.innerHTML = savedList.map(item => `
    <div class="p-4 bg-white border rounded-xl shadow-sm space-y-2">
      <div class="flex justify-between items-center">
        <h4 class="font-bold text-sm text-gray-800">${item.scholarships?.title}</h4>
        <button onclick="removeSaved('${item.id}')" class="text-xs text-red-500 hover:underline">ลบ</button>
      </div>
      
      <p class="text-xs text-gray-500">📅 กำหนดส่ง: ${item.scholarships?.deadline}</p>

      <div class="pt-2 border-t">
        <p class="text-xs font-semibold text-gray-700 mb-2">📋 เช็คลิสต์เอกสาร:</p>
        <div class="space-y-1.5">
          ${(item.checklist_items || []).map(check => `
            <label class="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" ${check.completed ? 'checked' : ''} 
                onchange="toggleChecklist('${check.id}', this.checked)"
                class="rounded text-emerald-600 focus:ring-emerald-500">
              <span class="${check.completed ? 'line-through text-gray-400' : ''}">
                ${check.scholarship_requirements?.document_name}
              </span>
            </label>
          `).join('') || '<p class="text-xs text-gray-400">ไม่มีเอกสารต้องส่ง</p>'}
        </div>
      </div>
    </div>
  `).join('');
}

async function toggleChecklist(checkId, isCompleted) {
  if (!supabaseClient) return;
  await supabaseClient
    .from('checklist_items')
    .update({ completed: isCompleted, updated_at: new Date() })
    .eq('id', checkId);

  fetchSavedScholarships();
}

async function removeSaved(savedId) {
  if (confirm('ยกเลิกการบันทึกทุนนี้?') && supabaseClient) {
    await supabaseClient.from('saved_scholarships').delete().eq('id', savedId);
    fetchSavedScholarships();
  }
}