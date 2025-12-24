// app.js
// - 利用コードログイン（大文字小文字無視）
// - 質問：ステップ分割（24問を複数ページ）
// - 自動保存（入力のたび）
// - 未回答一覧→クリックで該当設問へジャンプ
// - サンプル入力
// - 最終調整（任意）スイッチを生成に反映
(function(){
  const STORAGE_KEY = "MAG_DRAFT_V9";
  const LOGIN_KEY = "MAG_LOGIN_OK_V9";

  const VALID_CODES = ["OXUC"].map(s => String(s).trim().toUpperCase());

  const STEP_SIZE = 4; // 24問 → 6ステップ
  const el = (id) => document.getElementById(id);

  // Cards
  const cardLogin = el("cardLogin");
  const cardQuiz = el("cardQuiz");
  const cardOutput = el("cardOutput");

  // Login
  const agree = el("agree");
  const accessCode = el("accessCode");
  const loginMsg = el("loginMsg");
  const btnLogin = el("btnLogin");

  // Quiz
  const quizHost = el("quizHost");
  const progressBadge = el("progressBadge");
  const quizMsg = el("quizMsg");
  const btnBack = el("btnBack");
  const btnSaveDraft = el("btnSaveDraft");
  const btnGenerate = el("btnGenerate");
  const btnResetAllInline = el("btnResetAllInline");
  const btnSample = el("btnSample");
  const btnPrevStep = el("btnPrevStep");
  const btnNextStep = el("btnNextStep");
  const stepTitle = el("stepTitle");
  const stepRangeBadge = el("stepRangeBadge");
  const stepDots = el("stepDots");
  const missingBox = el("missingBox");
  const missingList = el("missingList");
  const missingMeta = el("missingMeta");

  // Output
  const outText = el("outText");
  const outMeta = el("outMeta");
  const btnCopy = el("btnCopy");
  const btnOpenCopilot = el("btnOpenCopilot");
  const btnBackToQuiz = el("btnBackToQuiz");
  const btnResetAllFromOut = el("btnResetAllFromOut");
  const copiedPanel = el("copiedPanel");
  const btnApply = el("btnApply");
  const applyMsg = el("applyMsg");
  const tabs = Array.from(document.querySelectorAll(".tab"));

  // Prefs
  const prefSuperBrief = el("prefSuperBrief");
  const prefStrictRisk = el("prefStrictRisk");
  const prefConclusionFirst = el("prefConclusionFirst");
  const prefAskBack = el("prefAskBack");

  // Toast
  let toastEl;

  let currentMode = "general";
  let currentStep = 0;
  let profile = {}; // answers map + _prefs
  let dirtyOutput = false;

  function show(elm, on){ elm.classList.toggle("hidden", !on); }

  function normalizeCode(code){ return String(code || "").trim().toUpperCase(); }
  function isValidCode(code){
    const c = normalizeCode(code);
    return c && VALID_CODES.includes(c);
  }
  function setLogin(ok){ localStorage.setItem(LOGIN_KEY, ok ? "1" : "0"); }
  function getLogin(){ return localStorage.getItem(LOGIN_KEY) === "1"; }

  function saveDraft(silent){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify({profile, currentStep}));
      if(!silent) showToast("下書きを保存しました");
    }catch(e){}
  }
  function loadDraft(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){ return null; }
  }

  function showToast(msg){
    if(!toastEl){
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=> toastEl.classList.remove("show"), 1100);
  }

  function resetAll(){
    if(!confirm("入力内容と結果をすべてリセットします。よろしいですか？")) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LOGIN_KEY);
    profile = {};
    currentMode = "general";
    currentStep = 0;
    accessCode.value = "";
    agree.checked = false;
    loginMsg.textContent = "";
    quizMsg.textContent = "";
    outText.value = "";
    outMeta.textContent = "";
    copiedPanel.style.display = "none";
    tabs.forEach(t => t.classList.toggle("active", t.dataset.mode === "general"));
    show(cardOutput, false);
    show(cardQuiz, false);
    show(cardLogin, true);
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function initCopilotLink(){ btnOpenCopilot.href = "https://copilot.microsoft.com/"; }

  function stepsTotal(){ return Math.ceil(window.MAG_QUESTIONS.length / STEP_SIZE); }
  function stepRange(step){
    const start = step * STEP_SIZE;
    const end = Math.min(window.MAG_QUESTIONS.length, start + STEP_SIZE);
    return {start, end};
  }
  function getQById(id){ return window.MAG_QUESTIONS.find(x => x.id === id); }

  function qTemplate(q){
    const wrap = document.createElement("div");
    wrap.className = "qCard";
    wrap.dataset.qid = q.id;

    const h = document.createElement("div");
    h.className = "qTitle";
    h.textContent = q.title;
    wrap.appendChild(h);

    const d = document.createElement("div");
    d.className = "qDesc";
    d.textContent = "意図：" + (q.desc || "—");
    wrap.appendChild(d);

    const list = document.createElement("div");
    list.className = "optionList";

    const name = "q_" + q.id;

    q.options.forEach((opt) => {
      const row = document.createElement("label");
      row.className = "optRow";

      const input = document.createElement("input");
      input.type = (q.type === "multi") ? "checkbox" : "radio";
      input.name = name;
      input.value = opt;

      const span = document.createElement("span");
      span.textContent = opt;

      row.appendChild(input);
      row.appendChild(span);
      list.appendChild(row);

      input.addEventListener("change", () => onAnswerChanged(q.id));
    });

    wrap.appendChild(list);

    const other = document.createElement("div");
    other.className = "otherBox hidden";
    other.innerHTML = `
      <label>その他（自由記述）</label>
      <input type="text" placeholder="あなた固有の条件・言い回し・例外ルールなど" />
      <div class="hint">※「その他」を選んだ場合は必須です（160文字まで推奨）</div>
    `;
    wrap.appendChild(other);

    other.querySelector("input").addEventListener("input", () => onAnswerChanged(q.id));
    return wrap;
  }

  function renderDots(){
    const total = stepsTotal();
    stepDots.innerHTML = "";
    for(let i=0;i<total;i++){
      const d = document.createElement("div");
      d.className = "dot";
      d.title = `ステップ ${i+1}`;
      d.addEventListener("click", ()=>{ currentStep=i; renderStep(); window.scrollTo({top:0, behavior:"smooth"}); });
      stepDots.appendChild(d);
    }
  }

  function renderStep(){
    const total = stepsTotal();
    const {start, end} = stepRange(currentStep);

    stepTitle.textContent = `ステップ ${currentStep+1} / ${total}`;
    if(stepRangeBadge){
      const qStart = start + 1;
      const qEnd = end;
      stepRangeBadge.textContent = `Q${qStart}–${qEnd}`;
    }
    // step theme (color)
    for(let i=0;i<6;i++){ cardQuiz.classList.remove(`stepTheme${i}`); }
    cardQuiz.classList.add(`stepTheme${currentStep}`);
    // Buttons enable
    btnPrevStep.disabled = currentStep === 0;
    btnNextStep.disabled = currentStep === total-1;
    // 最終ステップでは「次へ」を非表示
    btnNextStep.style.display = (currentStep === total-1) ? "none" : "";

    // dots status
    Array.from(stepDots.querySelectorAll(".dot")).forEach((d, idx)=>{
      d.classList.toggle("active", idx === currentStep);
      // done if all questions in that step answered
      const r = stepRange(idx);
      const done = window.MAG_QUESTIONS.slice(r.start, r.end).every(isAnswered);
      d.classList.toggle("done", done);
    });

    quizHost.innerHTML = "";
    const slice = window.MAG_QUESTIONS.slice(start, end);
    slice.forEach(q => quizHost.appendChild(qTemplate(q)));

    hydrateUIFromProfile();
    updateProgress();
    updateMissing();
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function onAnswerChanged(qid){
    const q = getQById(qid);
    const card = quizHost.querySelector(`[data-qid="${qid}"]`);
    if(!q || !card) return;

    const inputs = Array.from(card.querySelectorAll("input[type=radio],input[type=checkbox]"));
    const otherWrap = card.querySelector(".otherBox");
    const otherInput = otherWrap.querySelector("input[type=text]");

    let selected;
    if(q.type === "multi") selected = inputs.filter(i => i.checked).map(i => i.value);
    else selected = (inputs.find(i => i.checked)?.value) || "";

    const hasOther = (q.type === "multi") ? (selected.includes("その他")) : (selected === "その他");
    otherWrap.classList.toggle("hidden", !hasOther);

    const otherText = hasOther ? otherInput.value.trim() : "";
    profile[qid] = { type: q.type, selected: selected, other_text: otherText };

    // auto-save
    saveDraft(true);
    updateProgress();
    updateMissing();
  }

  function hydrateUIFromProfile(){
    // hydrate only rendered questions on current page
    const {start, end} = stepRange(currentStep);
    window.MAG_QUESTIONS.slice(start, end).forEach(q => {
      const a = profile[q.id];
      if(!a) return;
      const card = quizHost.querySelector(`[data-qid="${q.id}"]`);
      if(!card) return;

      const inputs = Array.from(card.querySelectorAll("input[type=radio],input[type=checkbox]"));
      const otherWrap = card.querySelector(".otherBox");
      const otherInput = otherWrap.querySelector("input[type=text]");

      if(q.type === "multi"){
        const sel = Array.isArray(a.selected) ? a.selected : [];
        inputs.forEach(i => i.checked = sel.includes(i.value));
      }else{
        inputs.forEach(i => i.checked = (a.selected === i.value));
      }

      const hasOther = (q.type === "multi") ? (Array.isArray(a.selected) && a.selected.includes("その他")) : (a.selected === "その他");
      otherWrap.classList.toggle("hidden", !hasOther);
      otherInput.value = hasOther ? (a.other_text || "") : "";
    });

    // hydrate prefs
    const p = (profile._prefs || {});
    prefSuperBrief.checked = !!p.superBrief;
    prefStrictRisk.checked = !!p.strictRisk;
    prefConclusionFirst.checked = !!p.conclusionFirst;
    prefAskBack.checked = !!p.askBack;
  }

  function isAnswered(q){
    const a = profile[q.id];
    if(!a) return false;
    if(q.type === "multi"){
      const sel = Array.isArray(a.selected) ? a.selected : [];
      if(sel.length === 0) return false;
      if(sel.includes("その他") && !(a.other_text||"").trim()) return false;
      return true;
    }else{
      const sel = String(a.selected||"").trim();
      if(!sel) return false;
      if(sel === "その他" && !(a.other_text||"").trim()) return false;
      return true;
    }
  }

  function updateProgress(){
    const total = window.MAG_QUESTIONS.length;
    const done = window.MAG_QUESTIONS.filter(isAnswered).length;
    progressBadge.textContent = `${done} / ${total}`;
  }

  function updateMissing(){
    const missing = window.MAG_QUESTIONS.filter(q => !isAnswered(q));
    if(!missing.length){
      missingMeta.textContent = "未回答はありません";
      missingList.innerHTML = "";
      return;
    }
    missingMeta.textContent = `${missing.length}件（クリックで移動）`;
    missingList.innerHTML = "";
    missing.slice(0, 24).forEach(q => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.type = "button";
      chip.textContent = q.title.split(".")[0] + "."; // "Q1."
      chip.addEventListener("click", ()=>{
        jumpToQuestion(q.id);
      });
      missingList.appendChild(chip);
    });
  }

  function jumpToQuestion(qid){
    const idx = window.MAG_QUESTIONS.findIndex(x => x.id === qid);
    if(idx < 0) return;
    currentStep = Math.floor(idx / STEP_SIZE);
    renderStep();
    // scroll to question
    setTimeout(()=>{
      const card = quizHost.querySelector(`[data-qid="${qid}"]`);
      if(card) card.scrollIntoView({behavior:"smooth", block:"center"});
      quizMsg.textContent = "";
    }, 50);
  }

  function validateAll(){
    const missing = window.MAG_QUESTIONS.filter(q => !isAnswered(q));
    if(missing.length){
      const first = missing[0];
      quizMsg.textContent = `未回答があります：${first.title}`;
      quizMsg.style.color = "#b91c1c";
      jumpToQuestion(first.id);
      return false;
    }
    quizMsg.textContent = "";
    quizMsg.style.color = "";
    return true;
  }


  function markDirty(){
    dirtyOutput = true;
    if(btnApply) btnApply.disabled = false;
    if(applyMsg) applyMsg.textContent = "変更は未反映です";
  }
  function setClean(){
    dirtyOutput = false;
    if(btnApply) btnApply.disabled = true;
    if(applyMsg) applyMsg.textContent = "反映済み";
  }
  function setMode(mode){
    currentMode = mode;
    tabs.forEach(t => t.classList.toggle("active", t.dataset.mode === mode));
    markDirty();
  }

  function capturePrefs(){
    profile._prefs = {
      superBrief: !!prefSuperBrief.checked,
      strictRisk: !!prefStrictRisk.checked,
      conclusionFirst: !!prefConclusionFirst.checked,
      askBack: !!prefAskBack.checked
    };
    saveDraft(true);
  }

  function renderOutput(){
    capturePrefs();
    const txt = window.MAG_generateInstructions(profile, currentMode);
    outText.value = txt;
    outMeta.textContent = `文字数：${txt.length}`;
    setClean();
  }

  function sampleFill(){
    // Fill with plausible defaults (non-sensitive). Overwrites current answers.
    if(!confirm("サンプル入力で自動的に回答を入れます（既存の回答は上書きされます）。よろしいですか？")) return;
    const qList = window.MAG_QUESTIONS;
    const pick = (arr)=> arr[Math.floor(Math.random()*Math.min(arr.length, 5))]; // bias early options
    qList.forEach(q=>{
      if(q.type === "single"){
        profile[q.id] = {type:"single", selected: pick(q.options.filter(x=>x!=="その他")) , other_text:""};
      }else{
        const opts = q.options.filter(x=>x!=="その他");
        // choose 2 options
        const shuffled = opts.slice().sort(()=>Math.random()-0.5);
        profile[q.id] = {type:"multi", selected: shuffled.slice(0, Math.min(2, shuffled.length)), other_text:""};
      }
    });
    // reset prefs
    profile._prefs = {superBrief:false, strictRisk:false, conclusionFirst:false, askBack:false};
    saveDraft(true);
    showToast("サンプル入力しました");
    renderStep();
  }

  // --- Events ---
  accessCode.addEventListener("input", () => {
    const v = normalizeCode(accessCode.value);
    if(accessCode.value !== v) accessCode.value = v;
  });

  btnLogin.addEventListener("click", () => {
    loginMsg.textContent = "";
    loginMsg.style.color = "";
    if(!agree.checked){
      loginMsg.textContent = "チェック（同意）を入れてください。";
      loginMsg.style.color = "#b45309";
      return;
    }
    if(!isValidCode(accessCode.value)){
      loginMsg.textContent = "利用コードが正しくありません。";
      loginMsg.style.color = "#b91c1c";
      return;
    }
    setLogin(true);
    show(cardLogin, false);
    show(cardQuiz, true);
    show(cardOutput, false);
    renderDots();
    renderStep();
  });

  btnBack.addEventListener("click", () => {
    show(cardQuiz, false);
    show(cardOutput, false);
    show(cardLogin, true);
    window.scrollTo({top:0, behavior:"smooth"});
  });

  btnSaveDraft.addEventListener("click", () => saveDraft(false));
  btnResetAllInline.addEventListener("click", resetAll);
  btnResetAllFromOut.addEventListener("click", resetAll);

  btnPrevStep.addEventListener("click", () => {
    if(currentStep>0){ currentStep--; saveDraft(true); renderStep(); }
  });
  btnNextStep.addEventListener("click", () => {
    const total = stepsTotal();
    if(currentStep<total-1){ currentStep++; saveDraft(true); renderStep(); }
  });

  btnSample.addEventListener("click", sampleFill);

  btnGenerate.addEventListener("click", () => {
    if(!validateAll()) return;
    saveDraft(true);
    show(cardQuiz, false);
    show(cardOutput, true);
    window.scrollTo({top:0, behavior:"smooth"});
    renderOutput();
  });

  btnBackToQuiz.addEventListener("click", () => {
    show(cardOutput, false);
    show(cardQuiz, true);
    window.scrollTo({top:0, behavior:"smooth"});
    renderStep();
  btnApply.addEventListener("click", () => {
    renderOutput();
    // 念のため表示状態も確実に更新
    if(applyMsg) applyMsg.textContent = "反映済み";
    if(btnApply) btnApply.disabled = true;
    dirtyOutput = false;
    showToast("反映しました");
  });

});

  btnCopy.addEventListener("click", async () => {
    if(dirtyOutput){
      renderOutput();
    }
    try{
      await navigator.clipboard.writeText(outText.value || "");
      btnCopy.textContent = "コピーしました";
      copiedPanel.style.display = "";
      setTimeout(() => btnCopy.textContent = "カスタム内容をコピー", 1000);
    }catch(e){
      alert("コピーに失敗しました。手動で選択してコピーしてください。");
    }
  });

  tabs.forEach(t => t.addEventListener("click", ()=> setMode(t.dataset.mode)));

  [prefSuperBrief, prefStrictRisk, prefConclusionFirst, prefAskBack].forEach(chk=>{
    chk.addEventListener("change", ()=>{ capturePrefs(); markDirty(); showToast("最終調整を更新しました（未反映）"); });
  });

  // --- Boot ---
  (function boot(){
    initCopilotLink();
    const draft = loadDraft();
    if(draft && draft.profile){
      profile = draft.profile || {};
      currentStep = Number.isFinite(draft.currentStep) ? draft.currentStep : 0;
    }
    if(getLogin()){
      show(cardLogin, false);
      show(cardQuiz, true);
      show(cardOutput, false);
      renderDots();
      renderStep();
    }else{
      show(cardLogin, true);
      show(cardQuiz, false);
      show(cardOutput, false);
    }
  })();
})();
