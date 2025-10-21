const http = require('http');

http.get('http://localhost:5000/api/teaching-quality/analyses/79d0a8fd-c101-465e-ac66-d8f05e795cb8', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const sugg = json.data.conversion_suggestions;

    console.log('=== Conversion Suggestions Structure ===');
    console.log('Type:', typeof sugg);
    console.log('Keys:', Object.keys(sugg));
    console.log('Has studentAnalysis:', !!sugg.studentAnalysis);
    console.log('Has salesStrategy:', !!sugg.salesStrategy);
    console.log('Has finalClosingScript:', !!sugg.finalClosingScript);

    if (sugg.studentAnalysis) {
      console.log('\n=== Student Analysis Keys ===');
      console.log(Object.keys(sugg.studentAnalysis));
    }

    if (sugg.salesStrategy) {
      console.log('\n=== Sales Strategy Keys ===');
      console.log(Object.keys(sugg.salesStrategy));
    }
  });
});
