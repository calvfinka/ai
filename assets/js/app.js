document.getElementById('buildBtn').addEventListener('click', async () => {
  const prompt = document.getElementById('promptInput').value;
  if(!prompt) return alert('Isi dulu mau bikin app apa, Jurkon!');
  document.getElementById('preview').innerHTML = 'AI lagi mikir...';
  const result = await buildApp(prompt);
  showPreview(result);
});
