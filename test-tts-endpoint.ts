const url = 'https://uscentralapi.mentra.glass/api/tts?text=hello';
fetch(url).then(res => {
  console.log(res.status);
  return res.text();
}).then(console.log).catch(console.error);
