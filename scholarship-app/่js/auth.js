// ดึงข้อมูล User ปัจจุบัน
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ตรวจสอบ Role ของผู้ใช้ (student, admin, reviewer)
async function getUserRole(userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  
  return data ? data.role : null;
}

// บังคับเช็คสิทธิ์ตาม Role (ถ้าไม่ใช่ Role ที่กำหนดจะถูกส่งกลับหน้าหลัก)
async function requireRole(allowedRoles = []) {
  const user = await getCurrentUser();
  if (!user) {
    alert('กรุณาเข้าสู่ระบบก่อนใช้งาน');
    window.location.href = 'login.html';
    return null;
  }

  const role = await getUserRole(user.id);
  if (!allowedRoles.includes(role)) {
    alert(`คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะ ${allowedRoles.join(', ')} เท่านั้น)`);
    window.location.href = 'index.html';
    return null;
  }

  return { user, role };
}

// ฟังก์ชันออกจากระบบ
async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}