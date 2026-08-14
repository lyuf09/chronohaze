(function () {
  "use strict";

  function isEnglish() {
    return (document.documentElement.lang || "").toLowerCase().indexOf("en") === 0;
  }

  function translateFullNotes(target) {
    if (!isEnglish()) return;

    var blocks = [
      "<strong>Musical notes</strong>",
      "<strong>Bass and voice opening.</strong> The initial spark came from Togenashi Togeari’s “Kūhaku to Catharsis,” but the arrangement that emerged is quite different. Orchid’s bass is neither staccato nor built around a repeated pitch; it keeps a continuous, fully shaped line moving beneath the vocal. Structurally, this is already the first half of the verse rather than a prelude or interlude that follows it. I love how nearly everything is removed, leaving the bass alone to carry the voice forward.",
      "<strong>Open-strummed guitars.</strong> When the guitars enter, the writing becomes deliberately simple: direct chord strumming with no embellishment. Complexity was not the point here. I wanted the physical immediacy of traditional rock—the feeling of singing with eyes closed, brow furrowed, and simply driving through the chords.",
      "<strong>Mixed metre into the main riff.</strong> The passage between the latter half of the verse and a pre-chorus follows one bar of 4/4, one bar of 7/8, and two bars of 4/4, with the full cycle repeated twice. The 7/8 bar feels like a sentence suddenly taking half a step less, producing a small bodily stumble. The main riff then locks guitar, bass, and drums together and abruptly tightens the previously loose verse into the prog-metalcore language I know best.",
      "<strong>One melody, three verse arrangements.</strong> After the main riff, the same vocal melody returns over a completely different foundation. Guitar alternates root-note palm mutes with ghost notes, shifting the melody’s centre of gravity. I would rather rewrite the underlying rhythm than create progression by merely adding another layer on the second pass. The third verse becomes more djent-oriented, with tight rhythm guitars below and melodic details above. Hybrid-picked bass retains its own grain and motion inside the grid, before the section accumulates into something close to a wall of sound.",
      "<strong>Melodic handoff and modulation.</strong> In the pre-chorus, the vocal sings only the first half before handing the principal melody directly to electric guitar. Continuous sixteenth notes push the line forward as the song moves from E major into A major—the IV region relative to E.",
      "<strong>Two languages inside the chorus.</strong> The melody and harmony have a Chinese-pop directness that I enjoy, while the instruments underneath still speak prog metalcore. The first half opens out to foreground voice, melody, and harmony; in the second half, the guitars turn distinctly toward djent, increasing rhythmic density and low-end weight without changing the chorus theme. The song then returns to E major and the main riff reappears.",
      "<strong>A clean but grid-locked breakdown.</strong> It is not aggressive at all—if anything, it feels unusually fresh. Two clean guitars and piano place light details above tightly synchronized djent from guitar, bass, and drums. I love the contradiction: the upper layer floats like air while everything underneath is locked into the rhythmic grid.",
      "<strong>The final chorus.</strong> Instead of returning immediately to A major, the song spends four understated bars in E major before modulating back. Familiar material is briefly placed in the “wrong” tonal location, and only four bars later finds its expected home.",
      "<strong>Clean solo and ending.</strong> After a one-bar transition comes a clean electric-guitar solo—something I rarely write. It develops alone for eight bars; then the band returns to E major and brings back the main riff while the solo continues above it, leaving spaces so the two lines do not compete. The moment the free, floating clean line meets the recurring riff is my favourite modulation in the song. The other instruments gradually stop, leaving the guitar to disappear through a final string of triplets without giving the struggle a formal resolution.",
    ];

    target.innerHTML = blocks.join("<br /><br />");
  }

  function enhance() {
    var article = document.querySelector(".orchid-track-page .music-detail-article");
    if (!article || article.querySelector(".orchid-production-notes")) return;

    var target = article.querySelector(".orchid-production-copy");
    if (!target || !target.parentNode) return;

    translateFullNotes(target);
    var english = isEnglish();
    var cards = [
      ["OPENING", "开场", english ? "Voice and melodic bass → open-strummed guitars" : "人声与旋律贝斯 → 开放扫弦"],
      ["METRE", "拍号", "4/4 · 7/8 · 4/4 × 2"],
      ["TONAL ARC", "调性路径", "E major → A major (IV) → E major"],
      ["TEXTURE", "声音质感", english ? "Hybrid-picked bass, clean layers and grid-locked djent" : "混拨贝斯、清音层次与严密 djent"],
    ];

    var section = document.createElement("section");
    section.className = "affizieren-production-notes orchid-production-notes";
    section.setAttribute("aria-label", english ? "Production and arrangement notes" : "制作与编曲说明");

    var grid = document.createElement("div");
    grid.className = "affizieren-note-summary-grid";
    cards.forEach(function (data) {
      var card = document.createElement("article");
      card.className = "affizieren-note-summary-card";
      var label = document.createElement("span");
      label.className = "affizieren-note-summary-label";
      label.textContent = english ? data[0] : data[1];
      var value = document.createElement("p");
      value.textContent = data[2];
      card.appendChild(label);
      card.appendChild(value);
      grid.appendChild(card);
    });

    var details = document.createElement("details");
    details.className = "affizieren-note-details";
    var summary = document.createElement("summary");
    summary.textContent = english ? "Full production and arrangement notes" : "完整制作与编曲说明";
    details.appendChild(summary);

    target.parentNode.insertBefore(section, target);
    target.classList.add("affizieren-note-full-copy");
    details.appendChild(target);
    section.appendChild(grid);
    section.appendChild(details);
  }

  enhance();
  document.addEventListener("chronohaze:page-swapped", enhance);
})();
