/**
 * ฟังก์ชันอัปโหลดไฟล์เข้า Supabase Storage
 * @param {File} file - ไฟล์ที่เลือกจาก <input type="file">
 * @param {string} pathFolder - ชื่อโฟลเดอร์ เช่น 'transcripts' หรือ 'certificates'
 * @returns {Promise<string|null>} - คืนค่า Public URL ของไฟล์ หรือ null ถ้าล้มเหลว
 */
async function uploadDocumentFile(file, pathFolder = 'applications') {
  if (!file) return null;

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${pathFolder}/${fileName}`;

    // 1. อัปโหลดไฟล์เข้า Bucket 'scholarship-documents'
    const { data, error } = await supabase.storage
      .from('scholarship-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading file:', error.message);
      alert('อัปโหลดไฟล์ไม่สำเร็จ: ' + error.message);
      return null;
    }

    // 2. ดึง Public URL ของไฟล์ที่อัปโหลดเสร็จแล้ว
    const { data: urlData } = supabase.storage
      .from('scholarship-documents')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (err) {
    console.error('Upload Error:', err);
    return null;
  }
}