async function run() {
  const req = await fetch('https://osa.icuni.org/');
  const html = await req.text();
  const scriptMatch = html.match(/src=\"(.*?\.js)\"/);
  if (scriptMatch) {
      console.log('Found main script:', scriptMatch[1]);
      const req2 = await fetch('https://osa.icuni.org' + scriptMatch[1]);
      const js = await req2.text();
      const gasMatch = js.match(/https:\/\/script\.google\.com\/macros\/s\/.*?\/exec/g);
      console.log('GAS URLs inside bundle:', gasMatch ? [...new Set(gasMatch)] : 'None');
  }
}
run().catch(console.error);
