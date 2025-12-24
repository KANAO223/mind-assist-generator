// app.js
// - 利用コードログイン
// - 質問レンダリング（全問：その他=自由記述）
// - ローカル生成（API不使用）
(function(){
  const STORAGE_KEY = "MAG_DRAFT_V1";
  const LOGIN_KEY = "MAG_LOGIN_OK_V1";

  // ✅ 利用コード（PoC用）: ここに配布コードを列挙してください
  const VALID_CODES = [
    "OXUC"
  ];

  const el = (id) => document.getElementById(id);

  const cardLogin = el("cardLogin");
  const cardQuiz = el("cardQuiz");
  const cardOutput = el("cardOutput");

  const agree = el("agree");
  const accessCode = el("accessCode");
  const loginMsg = el("loginMsg");
  const btnLogin = el("btnLogin");

  const quizHost = el("quizHost");
  const progressBadge = el("progressBadge");
  const quizMsg = el("quizMsg");
  const btnBack = el("btnBack");
  const btnSaveDraft = el("btnSaveDraft");
  const btnGenerate = el("btnGenerate");

  const outText = el("outText");
  const outMeta = el("outMeta");
  const btnCopy = el("btnCopy");
  const btnOpenCopilot = el("btnOpenCopilot");
  const btnBackToQuiz = el("btnBackToQuiz");
  const btnResetAll = el("btnResetAll");

  const tabs = Array.from(document.querySelectorAll(".tab"));

  let currentMode = "general";
  let profile = {}; // answers map

  function show(elm, on){ elm.classList.toggle("hidden", !on); }

  function isValidCode(code){
    const c = (code || "").trim();
    if(!c) return false;
    return VALID_CODES.includes(c);
  }

  function setLogin(ok){ localStorage.setItem(LOGIN_KEY, ok ? "1" : "0"); }
  function getLogin(){ return localStorage.getItem(LOGIN_KEY) === "1"; }

  function saveDraft(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); }
  function loadDraft(){
    try{ const raw = localStorage.getItem(STORAGE_KEY); if(!raw) return null; return JSON.parse(raw); }
    catch(e){ return null; }
  }

  function resetAll(){
    if(!confirm("入力内容と結果をすべてリセットします。よろしいですか？")) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LOGIN_KEY);
    profile = {};
    currentMode = "general";
    accessCode.value = "";
    agree.checked = false;
    loginMsg.textContent = "";
    quizMsg.textContent = "";
    outText.value = "";
    outMeta.textContent = "";
    tabs.forEach(t => t.classList.toggle("active", t.dataset.mode === "general"));
    show(cardOutput, false);
    show(cardQuiz, false);
    show(cardLogin, true);
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function initCopilotLink(){ btnOpenCopilot.href = "https://copilot.microsoft.com/"; }

  function qTemplate(q){
    const wrap = document.createElement("div");
    wrap.className = "qCard";
    wrap.dataset.qid = q.id;

    const h = document.createElement("div");
    h.className = "qTitle";
    h.textContent = q.title;
    wrap.appendChild(h);

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
      <input type="text" placeholder="例）あなた固有の条件・言い回し・例外ルールなど" />
      <div class="hint">※「その他」を選んだ場合は必須です（120文字まで推奨）</div>
    `;
    wrap.appendChild(other);

    other.querySelector("input").addEventListener("input", () => onAnswerChanged(q.id));
    return wrap;
  }

  function renderQuestions(){
    quizHost.innerHTML = "";
    window.MAG_QUESTIONS.forEach(q => { quizHost.appendChild(qTemplate(q)); });
    hydrateUIFromProfile();
    updateProgress();
  }

  function getQById(id){ return window.MAG_QUESTIONS.find(x => x.id === id); }

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
    updateProgress();
  }

  function hydrateUIFromProfile(){
    window.MAG_QUESTIONS.forEach(q => {
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
      const sel = (a.selected||"").trim();
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

  function validateAll(){
    const missing = window.MAG_QUESTIONS.filter(q => !isAnswered(q));
    if(missing.length){
      const first = missing[0];
      const card = quizHost.querySelector(`[data-qid="${first.id}"]`);
      if(card) card.scrollIntoView({behavior:"smooth", block:"center"});
      quizMsg.textContent = `未回答があります：${first.title}`;
      quizMsg.style.color = "#b91c1c";
      return false;
    }
    quizMsg.textContent = "";
    quizMsg.style.color = "";
    return true;
  }

  function renderOutput(){
    const txt = window.MAG_generateInstructions(profile, currentMode);
    outText.value = txt;
    outMeta.textContent = `文字数：${txt.length}`;
  }

  function setMode(mode){
    currentMode = mode;
    tabs.forEach(t => t.classList.toggle("active", t.dataset.mode === mode));
    renderOutput();
  }

  // Events
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
    window.scrollTo({top:0, behavior:"smooth"});
    renderQuestions();
  });

  btnBack.addEventListener("click", () => {
    show(cardQuiz, false);
    show(cardOutput, false);
    show(cardLogin, true);
    window.scrollTo({top:0, behavior:"smooth"});
  });

  btnSaveDraft.addEventListener("click", () => {
    saveDraft();
    quizMsg.textContent = "下書きを保存しました。";
    quizMsg.style.color = "#166534";
    setTimeout(() => { quizMsg.textContent=""; quizMsg.style.color=""; }, 1500);
  });

  btnGenerate.addEventListener("click", () => {
    if(!validateAll()) return;
    saveDraft();
    show(cardQuiz, false);
    show(cardOutput, true);
    window.scrollTo({top:0, behavior:"smooth"});
    renderOutput();
  });

  btnBackToQuiz.addEventListener("click", () => {
    show(cardOutput, false);
    show(cardQuiz, true);
    window.scrollTo({top:0, behavior:"smooth"});
  });

  btnCopy.addEventListener("click", async () => {
    try{
      await navigator.clipboard.writeText(outText.value || "");
      btnCopy.textContent = "コピーしました";
      setTimeout(() => btnCopy.textContent = "コピー", 900);
    }catch(e){
      alert("コピーに失敗しました。手動で選択してコピーしてください。");
    }
  });

  tabs.forEach(t => { t.addEventListener("click", () => setMode(t.dataset.mode)); });
  btnResetAll.addEventListener("click", resetAll);

  // Init
  (function boot(){
    initCopilotLink();
    const draft = loadDraft();
    if(draft) profile = draft;

    if(getLogin()){
      show(cardLogin, false);
      show(cardQuiz, true);
      show(cardOutput, false);
      renderQuestions();
    }else{
      show(cardLogin, true);
      show(cardQuiz, false);
      show(cardOutput, false);
    }
  })();
})();
