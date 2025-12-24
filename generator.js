// generator.js
// API不使用：すべてクライアント側で文章生成（テンプレート方式）

(function(){
  function uniq(arr){
    return Array.from(new Set((arr||[]).filter(Boolean)));
  }
  function joinCompact(arr){
    const u = uniq(arr);
    return u.length ? u.join(" / ") : "（未指定）";
  }
  function sanitizeOtherText(t){
    if(!t) return "";
    // ざっくり：改行を整形、長すぎる場合は切る（カスタム指示を太らせない）
    return String(t).replace(/\s+/g," ").trim().slice(0, 120);
  }

  function pickOther(answerObj){
    if(!answerObj) return "";
    const t = sanitizeOtherText(answerObj.other_text);
    return t ? `（その他: ${t}）` : "";
  }

  function valStr(profile, id){
    const a = profile[id];
    if(!a) return "（未回答）";
    if(a.type === "multi"){
      const base = joinCompact(a.selected || []);
      const o = pickOther(a);
      return o ? `${base} ${o}` : base;
    }
    // single
    const base = a.selected || "（未回答）";
    const o = pickOther(a);
    return o ? `${base} ${o}` : base;
  }

  function modeHeader(mode){
    switch(mode){
      case "judge": return "【Judge｜審査官モード】";
      case "editor": return "【Editor｜編集長モード】";
      case "advisor": return "【Advisor｜参謀モード】";
      default: return "【General｜通常モード】";
    }
  }

  function modePurpose(mode){
    if(mode==="judge") return "目的：GO/NO-GO判断、反証（失敗条件）とリスクの洗い出しを優先。";
    if(mode==="editor") return "目的：要点抽出・比較整理・読み手に刺さる文章/体裁に整える。";
    if(mode==="advisor") return "目的：次の打ち手を前に進める（最小実験・論点・次アクション）。";
    return "目的：あなたの判断基準に沿って、情報整理→考察→次アクションまで一貫して支援。";
  }

  function emphasizeRules(profile, mode){
    const lines = [];
    // Common safety rails
    lines.push("禁止：根拠のない断定、推測の事実化、機密/個人情報の深掘り要求。");
    // ambiguity handling
    const amb = valStr(profile, "ambiguity");
    if(amb.includes("確度")) lines.push("推定する場合は「前提」と「確度（高/中/低）」を必ず付ける。");
    else if(amb.includes("前提")) lines.push("推定する場合は「前提」を必ず明記する。");
    else if(amb.includes("避ける")) lines.push("推定は極力避け、事実と不明点を分けて書く。");
    else if(amb.includes("断定")) lines.push("スピード優先で結論を先に出し、根拠不足は不足情報として明示する。");

    // Mode-specific emphasis
    if(mode==="judge"){
      lines.push("最初にNO-GO（即アウト）条件を照合し、該当があれば明確に指摘する。");
      lines.push("次に反証（失敗の最初の壊れ方）を3つ挙げ、回避策/確認事項を示す。");
      lines.push("最後に「追加で確認する情報」を1つだけ選び、理由を書く。");
    }else if(mode==="editor"){
      lines.push("読み手（想定読者）を意識し、結論を先に短く提示する。");
      lines.push("冗長さ・重複・目的外情報を削り、必要なら表で整理する。");
    }else if(mode==="advisor"){
      lines.push("最小実験（期間/指標/手順）を提案し、判断を前に進める。");
      lines.push("次アクションは1つ（最重要）を基本に、必要なら優先順位付きで最大3つ。");
    }else{
      lines.push("まず目的に沿って「残す/捨てる/後で」を仕分けし、結論→根拠→次アクションで返す。");
    }
    return lines;
  }

  function outputFormat(profile, mode){
    const base = valStr(profile, "outputBase");
    const len = valStr(profile, "conclusionLen");
    const ev = valStr(profile, "evidenceCount");
    const next = valStr(profile, "nextAction");
    const tone = valStr(profile, "tone");
    const fmt = valStr(profile, "formatRules");

    const lines = [];
    lines.push(`出力形式：${base}`);
    lines.push(`結論：${len}（先に結論を出す）`);
    lines.push(`根拠：${ev}（各根拠は短く）`);
    lines.push(`次アクション：${next}`);
    lines.push(`トーン：${tone}`);
    lines.push(`書式ルール：${fmt}`);
    if(mode==="editor" && !fmt.includes("表")){
      lines.push("可能なら「比較表」または「見出し＋箇条書き」で構造化する。");
    }
    if(fmt.includes("800字")){
      lines.push("長文化する場合は、まず短い要約を出してから詳細を続ける。");
    }
    return lines;
  }

  function decisionRubric(profile, mode){
    const axes = valStr(profile, "evalAxes");
    const rank = valStr(profile, "evalRank");
    const go = valStr(profile, "goMin");
    const nogo = valStr(profile, "noGo");
    const un = valStr(profile, "uncertainty");
    const extra = valStr(profile, "extraInfo");
    const irr = valStr(profile, "irreversible");
    const fals = valStr(profile, "falsification");

    const lines = [];
    lines.push(`評価軸：${axes}`);
    lines.push(`優先順位の目安：${rank}`);
    lines.push(`GO最低条件：${go}`);
    lines.push(`NO-GO（一発アウト）：${nogo}`);
    lines.push(`不確実性が高い時：${un}`);
    lines.push(`追加で確認する情報（最優先）：${extra}`);
    lines.push(`不可逆案件の扱い：${irr}`);
    lines.push(`反証の姿勢：${fals}`);
    if(mode==="judge"){
      lines.unshift("判断は保守的に：重大リスクが残る場合は「保留＋追加確認」を推奨してよい。");
    }
    return lines;
  }

  function personaContext(profile){
    const role = valStr(profile, "roleType");
    const aud = valStr(profile, "audiences");
    const pri = valStr(profile, "topPriority");
    const style = valStr(profile, "decisionStyle");
    const info = valStr(profile, "infoTypes");
    const inter = valStr(profile, "interaction");
    const goal = valStr(profile, "goal");

    return [
      `あなたは私の「情報整理・判断・考察の相棒」です。`,
      `私の主業務：${role}`,
      `想定読者：${aud}`,
      `最優先：${pri}`,
      `判断スタイル：${style}`,
      `よく扱う情報：${info}`,
      `相談スタイル：${inter}`,
      `この会話での目的：${goal}`,
    ];
  }

  function dontDoList(profile){
    const dd = valStr(profile, "dontDo");
    return [
      `追加の禁止事項（私の嗜好）：${dd}`
    ];
  }

  function build(profile, mode){
    const lines = [];
    lines.push(modeHeader(mode));
    lines.push(modePurpose(mode));
    lines.push("");
    lines.push("■ 前提（私について）");
    lines.push(...personaContext(profile));
    lines.push("");
    lines.push("■ 判断基準");
    lines.push(...decisionRubric(profile, mode).map(x => `- ${x}`));
    lines.push("");
    lines.push("■ 出力形式");
    lines.push(...outputFormat(profile, mode).map(x => `- ${x}`));
    lines.push("");
    lines.push("■ ガードレール");
    lines.push(...emphasizeRules(profile, mode).map(x => `- ${x}`));
    lines.push(...dontDoList(profile).map(x => `- ${x}`));
    lines.push("");
    lines.push("■ いつも最後に付けること");
    lines.push("- 重要論点（最大3つ）");
    lines.push("- 次アクション（原則1つ、必要なら最大3つ）");
    lines.push("- 不足情報（1つだけ）と、その理由");
    return lines.join("\n");
  }

  window.MAG_generateInstructions = function(profile, mode){
    return build(profile, mode || "general");
  };
})();
