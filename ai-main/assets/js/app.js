document.getElementById('buildBtn').addEventListener('click', async () => {
  const prompt = document.getElementById('promptInput').value.trim();
  if (!prompt) return alert('Tulis dulu rencana yang ingin dibuat, misalnya pendakian atau konser.');
  document.getElementById('preview').textContent = 'Sedang menyusun rencana...';
  const result = await buildApp(prompt);
  showPreview(result);
});
