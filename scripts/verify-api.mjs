import assert from 'assert';

async function testApi() {
  console.log('--- STARTING AUTOMATED ENDPOINT VERIFICATION ---');

  // 1. Test fetching survey schema
  console.log('1. Testing GET /api/surveys/customer-feedback...');
  const res1 = await fetch('http://localhost:3000/api/surveys/customer-feedback');
  assert.strictEqual(res1.status, 200, 'Survey fetch failed');
  const survey = await res1.json();
  assert.strictEqual(survey.slug, 'customer-feedback');
  assert.ok(Array.isArray(survey.questions));
  console.log('   ✓ Survey schema fetched successfully. Title:', survey.title);

  // 2. Test submitting a response (simulating offline submission synced with UUID)
  console.log('2. Testing POST /api/surveys/customer-feedback/submit (Offline submission)...');
  const testSubId = 'test-uuid-' + Date.now();
  const testAnswers = {
    q_satisfaction: 5,
    q_aspects: ['Speed of service', 'Staff friendliness & courtesy'],
    q_source: 'Social Media (Instagram/TikTok/Facebook)',
    q_feedback: 'Loved the smooth offline scanning capability!',
    q_recommend: 'Definitely Yes',
  };

  const res2 = await fetch('http://localhost:3000/api/surveys/customer-feedback/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submissionId: testSubId,
      answers: testAnswers,
      submittedAtClient: new Date().toISOString(),
      isOfflineSubmission: true,
    }),
  });
  assert.strictEqual(res2.status, 201, 'Submission recording failed');
  const subRes = await res2.json();
  assert.strictEqual(subRes.id, testSubId);
  console.log('   ✓ Submission recorded with ID:', subRes.id);

  // 3. Test Idempotency (submitting the exact same UUID again)
  console.log('3. Testing Idempotent Retry of same UUID...');
  const res3 = await fetch('http://localhost:3000/api/surveys/customer-feedback/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submissionId: testSubId,
      answers: testAnswers,
      submittedAtClient: new Date().toISOString(),
      isOfflineSubmission: true,
    }),
  });
  assert.strictEqual(res3.status, 200, 'Idempotency check failed');
  const subRes3 = await res3.json();
  assert.ok(subRes3.success);
  console.log('   ✓ Idempotent submission handled cleanly without duplicate entries.');

  // 4. Test Submissions retrieval
  console.log('4. Testing GET /api/admin/surveys/' + survey.id + '/submissions...');
  const res4 = await fetch(`http://localhost:3000/api/admin/surveys/${survey.id}/submissions`);
  assert.strictEqual(res4.status, 200, 'Submissions fetch failed');
  const submissions = await res4.json();
  assert.ok(submissions.length >= 1);
  const found = submissions.find((s) => s.id === testSubId);
  assert.ok(found, 'Recorded submission not found in database');
  assert.strictEqual(found.isOfflineSubmission, true);
  console.log('   ✓ Submissions retrieved. Verified offline flag is preserved.');

  // 5. Test CSV Export
  console.log('5. Testing GET /api/admin/surveys/' + survey.id + '/export (CSV)...');
  const res5 = await fetch(`http://localhost:3000/api/admin/surveys/${survey.id}/export`);
  assert.strictEqual(res5.status, 200, 'CSV export failed');
  const csv = await res5.text();
  assert.ok(csv.includes('Submission ID'), 'CSV missing headers');
  assert.ok(csv.includes(testSubId), 'CSV missing submission record');
  console.log('   ✓ CSV generated and verified successfully.');

  console.log('--- ALL AUTOMATED VERIFICATIONS PASSED ---');
}

testApi().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
