import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/index.js';

const pw='Example-very-long-password!';
process.env.SITE_PASSWORD=pw;
process.env.OPENAI_API_KEY='sk-test-dummy';
const basic={Authorization:'Basic '+Buffer.from('studio:'+pw).toString('base64')};
const url=(path)=>new URL(path,'https://example.vercel.app');
const call=(path,opts={})=>handler.fetch(new Request(url(path),opts));
const photo='data:image/jpeg;base64,'+Buffer.from([255,216,255,224,0,0,1,2,3]).toString('base64');
const sample={identity_description:'Exact original identity',face_and_head_features:['original nose'],hair_skin_and_other_features:['texture'],visible_body_and_proportions:['shoulder width'],identity_uncertainties:[],scene_description:'city street',pose_and_gesture:'standing',composition_and_crop:'portrait',clothing_accessories_and_props:'blue top',background_and_environment:'city',lighting_and_color_grade:'sunlight',camera_style_and_realism:'photography',fine_scene_details:['lamp'],reconstruction_conflicts:[]};

// Node tests are deliberately isolated and never call the real OpenAI API.
test('No password configured: frontend returns setup error', async()=>{
  const old=process.env.SITE_PASSWORD;
  delete process.env.SITE_PASSWORD;
  const r=await call('/?ips_route=home');
  process.env.SITE_PASSWORD=old;
  assert.equal(r.status,503);
});
test('Static files require login; 401 challenge is sent',async()=>{
  for(const p of ['/?ips_route=home','/api/index?ips_route=script','/api/index?ips_route=style']){
    const r=await call(p);
    assert.equal(r.status,401,p);
    assert.match(r.headers.get('www-authenticate'),/Basic/);
  }
});
test('Logged-in user can load all packaged assets and headers',async()=>{
  for(const [flag,need,type] of [['home','IDENTITY','text/html'],['style','body','text/css'],['script','generate','javascript']]){
    const r=await call('/api/index?ips_route='+flag,{headers:basic});
    assert.equal(r.status,200,flag);
    assert.match(r.headers.get('content-type'),new RegExp(type));
    assert.match(await r.text(),new RegExp(need,'i'));
    assert.match(r.headers.get('content-security-policy'),/frame-ancestors/);
    assert.equal(r.headers.get('cache-control'),'no-store');
  }
});
test('Unknown paths are 404; private assets cannot be loaded by path',async()=>{
  for(const p of ['/private/index.html','/lib/worker-core.js','/api/index.js','/random']){
    const r=await call(p,{headers:basic});
    assert.equal(r.status,404,p);
  }
});
test('AI detection requires auth and detects server key',async()=>{
  const response=await call('/api/index?ips_route=config',{headers:basic});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{hosted_ai_enabled:true});
  const saved=process.env.OPENAI_API_KEY; delete process.env.OPENAI_API_KEY;
  assert.deepEqual(await (await call('/api/config',{headers:basic})).json(),{hosted_ai_enabled:false});
  process.env.OPENAI_API_KEY=saved;
});
test('AI can analyze refs and target and generate JSON using mocked API',async()=>{
  const old=globalThis.fetch;
  globalThis.fetch=async(path,opts)=>{
    assert.equal(path,'https://api.openai.com/v1/responses');
    const payload=JSON.parse(opts.body);
    assert.equal(payload.input[0].content.filter(x=>x.type==='input_image').length,3);
    assert.equal(payload.store,false);
    return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(sample)}]}]});
  };
  try {
    const response=await call('/api/index?ips_route=generate',{method:'POST',headers:{...basic,'Content-Type':'application/json'},body:JSON.stringify({identity_images:[photo,photo],target_image:photo,target_dimensions:{width:1080,height:1920},notes:'Keep original birthmark',aspect_ratio:'auto'})});
    assert.equal(response.status,200,await response.clone().text());
    const result=(await response.json()).result;
    assert.equal(result.identity_lock.mode,'MAXIMUM');
    assert.equal(result.output_settings.aspect_ratio,'9:16');
    assert.match(result.main_prompt,/Keep original birthmark/);
  } finally{globalThis.fetch=old;}
});
test('Bad image request rejected',async()=>{
  const r=await call('/api/index?ips_route=generate',{method:'POST',headers:{...basic,'Content-Type':'application/json'},body:JSON.stringify({identity_images:[]})});
  assert.equal(r.status,400);
});
