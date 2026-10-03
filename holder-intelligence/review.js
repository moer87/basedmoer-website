/* Deterministic authorized evidence presentation; no model or saved memory. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MoerHolderReview=factory();})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const fail=()=>{throw new Error('INVALID_REVIEW_RESPONSE');};
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
function exact(x,required,optional=[]){if(!object(x)||required.some(k=>!(k in x))||Object.keys(x).some(k=>!required.includes(k)&&!optional.includes(k)))fail();}
function label(x){if(typeof x!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_./:-]{0,127}$/.test(x))fail();}
function codes(x){if(!Array.isArray(x)||x.length>32||x.some(v=>typeof v!=='string'||!/^[a-z][a-z0-9_]{0,127}$/.test(v)))fail();}
function timestamp(x){if(typeof x!=='string'||x.length>64||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(x)||!Number.isFinite(Date.parse(x)))fail();return Date.parse(x);}
function references(rows){if(!Array.isArray(rows)||rows.length<1||rows.length>8)fail();const seen=new Set();for(const r of rows){exact(r,['product','record_id']);if(!['scanner','radar_signal','radar_candidate'].includes(r.product)||typeof r.record_id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(r.record_id))fail();const key=r.product+':'+r.record_id;if(seen.has(key))fail();seen.add(key);}return rows;}
function parseReferences(text){if(typeof text!=='string'||new TextEncoder().encode(text).byteLength>4096)throw new Error('INVALID_REVIEW_INPUT');const rows=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const words=line.split(/\s+/);if(words.length!==2)throw new Error('INVALID_REVIEW_INPUT');return {product:words[0],record_id:words[1]};});return references(rows);}
const decimal=value=>{if(typeof value!=='string'||value.length>128||!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)||!Number.isFinite(Number(value))||Number(value)>1e30)fail();};
function facts(f,product){
 if(product==='scanner'){
  exact(f,['direction','entry','stop_loss','take_profit','gross_risk_reward','quality_score','score_kind','status','costs','net_risk_reward'],['reported_risk_reward','reported_rr_matches_levels']);
  for(const key of ['entry','stop_loss','take_profit','gross_risk_reward','quality_score'])decimal(f[key]);
  if(!['LONG','SHORT'].includes(f.direction)||!['OPEN','WAITING','ACTIVE','WIN','LOSS','MISSED','EXPIRED','CANCELLED','UNKNOWN'].includes(f.status)||f.score_kind!=='uncalibrated_quality'||Number(f.quality_score)>100||f.costs!=='unknown'||f.net_risk_reward!==null)fail();
  if(f.reported_risk_reward!==undefined)decimal(f.reported_risk_reward);if(f.reported_rr_matches_levels!==undefined&&typeof f.reported_rr_matches_levels!=='boolean')fail();
 }else{
  exact(f,['radar_score','score_kind','alert_price','price_semantics','security_validated','holder_intelligence_validated']);decimal(f.radar_score);decimal(f.alert_price);
  if(Number(f.radar_score)>100||f.score_kind!=='uncalibrated_quality'||!['recorded_alert_price_not_executable_quote','recorded_candidate_price_not_executable_quote'].includes(f.price_semantics)||!['recorded_true_not_independent_verification','not_established'].includes(f.security_validated)||!['recorded_true_not_independent_verification','not_established'].includes(f.holder_intelligence_validated))fail();
 }
}
const tables={scanner:'signals',radar_signal:'radar_signal_events',radar_candidate:'token_radar_candidates'};
function explanation(e,ref,asOf){
 exact(e,['schema_version','product','disposition','reason_codes','facts','evidence','limitations'],['identity','as_of','record']);
 const expected=ref.product==='scanner'?'scanner':'radar';if(e.schema_version!=='moer.evidence-explanation.v1'||!['EXPLAIN','ABSTAIN'].includes(e.disposition)||(e.product!==expected&&!(e.product==='unsupported'&&e.disposition==='ABSTAIN')))fail();
 codes(e.reason_codes);codes(e.limitations);if(!object(e.facts)||!Array.isArray(e.evidence)||e.evidence.length>8||new TextEncoder().encode(JSON.stringify(e)).byteLength>8192)fail();
 if(e.as_of!==undefined&&e.as_of!==asOf)fail();
 for(const cite of e.evidence){exact(cite,['ref','source','observed_at','available_at']);label(cite.ref);label(cite.source);const observed=timestamp(cite.observed_at),available=timestamp(cite.available_at);if(observed>available||available>timestamp(asOf))fail();}
 if(e.identity!==undefined){exact(e.identity,['kind','namespace','asset','market']);Object.values(e.identity).forEach(label);}
 if(e.record!==undefined){exact(e.record,['table','id','payload_sha256']);if(e.record.table!==tables[ref.product]||e.record.id!==ref.record_id||typeof e.record.payload_sha256!=='string'||!/^[a-f0-9]{64}$/.test(e.record.payload_sha256))fail();}
 if(e.disposition==='EXPLAIN'){if(!e.evidence.length||!e.identity||!e.record||e.as_of!==asOf)fail();facts(e.facts,expected);if(e.identity.kind!==(expected==='scanner'?'exchange_pair':'token_pool'))fail();if(expected==='radar'&& !['base','solana','robinhood'].includes(e.identity.namespace))fail();}
 else if(Object.keys(e.facts).length||e.evidence.length||!e.reason_codes.length)fail();
 return e;
}
function validate(data,requested){
 references(requested);exact(data,['schema_version','intent','as_of','disposition','conclusion','coverage','items','limitations','execution_enabled','memory_saved']);
 if(data.schema_version!=='moer.evidence-review.v1'||data.intent!=='review_records'||data.execution_enabled!==false||data.memory_saved!==false)fail();timestamp(data.as_of);codes(data.limitations);
 exact(data.coverage,['requested','explained','abstained','unavailable','tool_errors','scope']);if(data.coverage.scope!=='explicit_requested_records_only'||data.coverage.requested!==requested.length||!Array.isArray(data.items)||data.items.length!==requested.length)fail();
 const counts={explained:0,abstained:0,unavailable:0,tool_errors:0},actions={explained:'inspect_evidence',abstained:'resolve_evidence_gap',unavailable:'record_unavailable',tool_error:'retry_later'};
 data.items.forEach((item,index)=>{exact(item,['reference','outcome','next_action'],['explanation']);references([item.reference]);if(item.reference.product!==requested[index].product||item.reference.record_id!==requested[index].record_id||!Object.hasOwn(actions,item.outcome)||item.next_action!==actions[item.outcome])fail();counts[item.outcome==='tool_error'?'tool_errors':item.outcome]++;
  if(['explained','abstained'].includes(item.outcome)){const e=explanation(item.explanation,item.reference,data.as_of);if((e.disposition==='EXPLAIN')!==(item.outcome==='explained'))fail();}else if(item.explanation!==undefined)fail();
 });
 for(const key in counts)if(data.coverage[key]!==counts[key])fail();
 const disposition=counts.explained===requested.length?'complete':counts.explained?'partial':'abstain';
 const conclusion=counts.explained+' of '+requested.length+' requested records have explainable evidence. '+counts.abstained+' abstained; '+counts.unavailable+' unavailable; '+counts.tool_errors+' tool errors.';
 if(data.disposition!==disposition||data.conclusion!==conclusion)fail();return data;
}
function validateListing(data,product,limit){
 if(!['scanner','radar_signal','radar_candidate'].includes(product)||!Number.isInteger(limit)||limit<1||limit>20)fail();
 exact(data,['schema_version','product','records','requested_limit','scope','ordering','completeness','limitations']);
 if(data.schema_version!=='moer.record-list.v1'||data.product!==product||data.requested_limit!==limit||data.scope!=='approved_shared_holder_records'||data.ordering!=='recorded_row_time_desc_id_desc'||data.completeness!=='bounded_listing_not_market_coverage'||!Array.isArray(data.records)||data.records.length>limit)fail();codes(data.limitations);
 const seen=new Set();for(const row of data.records){exact(row,['product','record_id','time_semantics','evidence_state'],['display_label','recorded_at']);references([{product:row.product,record_id:row.record_id}]);if(row.product!==product||seen.has(row.record_id)||row.time_semantics!=='recorded_row_time_not_provider_observation'||row.evidence_state!=='not_evaluated')fail();seen.add(row.record_id);if(row.display_label!==undefined)label(row.display_label);if(row.recorded_at!==undefined)timestamp(row.recorded_at);}
 return data;
}
function render(document,container,data){
 container.replaceChildren();const add=(parent,tag,text,className)=>{const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;parent.appendChild(node);return node;};
 add(container,'p',data.conclusion,'review-summary');add(container,'p','Scope: only your '+data.coverage.requested+' supplied records. As of '+data.as_of+'. No market-wide ranking, probability or trade authorization.');
 for(const item of data.items){const card=add(container,'article','','review-item');add(card,'h3',item.reference.product+' · '+item.reference.record_id);add(card,'p','Evidence status: '+item.outcome+'. Next step: '+item.next_action.replaceAll('_',' ')+'.');
  const e=item.explanation;if(!e){add(card,'p',item.outcome==='unavailable'?'Record unavailable within your authorized scope. No existence or ownership is inferred.':'The evidence tool could not complete this record. Retry later.');continue;}
  if(e.disposition==='ABSTAIN')add(card,'p','Missingness / abstention: '+e.reason_codes.map(c=>c.replaceAll('_',' ')).join('; '));
  else{add(card,'p','Identity: '+e.identity.namespace+' · '+e.identity.asset+' · '+e.identity.market);const list=add(card,'dl','');for(const [key,value] of Object.entries(e.facts)){add(list,'dt',key.replaceAll('_',' '));add(list,'dd',value===null?'Not established':typeof value==='string'?value.replaceAll('_',' '):String(value));}for(const cite of e.evidence){add(card,'p','Citation: '+cite.ref+' · source '+cite.source+' · observed '+cite.observed_at+' · available '+cite.available_at,'review-citation');}add(card,'p','Record: '+e.record.table+' / '+e.record.id+' · payload SHA-256 '+e.record.payload_sha256,'review-record');}
  add(card,'p','Source limits: '+e.limitations.map(c=>c.replaceAll('_',' ')).join('; '));
 }
 add(container,'p','Review limits: '+data.limitations.map(c=>c.replaceAll('_',' ')).join('; ')+'. This review is not saved as conversation memory.');
}
return Object.freeze({parseReferences,validate,validateListing,render});
});
