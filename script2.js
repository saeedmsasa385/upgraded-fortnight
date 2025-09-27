// script.js — تفاعلات الموقع: جلب السور، عرض السورة، مقالات، وتعليقات محلية
const API_BASE = 'https://api.alquran.cloud/v1';

// ----- index.html: populate latest sample items -----
document.addEventListener('DOMContentLoaded', ()=>{
  // إذا على صفحة index
  if(document.getElementById('latest-list')){
    const latestList = document.getElementById('latest-list');
    const samples = [
      {title: 'تأملات في سورة الفاتحة', href:'articles2.html#'},
      {title: 'حديث عن الصدق', href:'articles2.html#'},
      {title: 'موقف نبوي: العفو عند المقدرة', href:'articles2.html#'}
    ];
    samples.forEach(s=>{
      const li = document.createElement('li');
      li.innerHTML = `<a href="${s.href}">${s.title}</a>`;
      latestList.appendChild(li);
    });
  }

  // ----- quran.html logic -----
  if(document.getElementById('surah-list')){
    initQuranPage();
  }

  // ----- articles page logic -----
  if(document.getElementById('articles-list')){
    initArticlesPage();
  }
});

// ---------- Quran page functions ----------
async function initQuranPage(){
  const listEl = document.getElementById('surah-list');
  const contentEl = document.getElementById('surah-content');
  const searchInput = document.getElementById('surah-search');

  try{
    const res = await fetch(`${API_BASE}/surah`);
    const data = await res.json();
    // data.data should be array of surahs
    const surahs = data.data || [];
    listEl.innerHTML = '';
    surahs.forEach(s => {
      const btn = document.createElement('div');
      btn.className = 'surah-item';
      btn.textContent = `${s.number}. ${s.name} — ${s.englishName}`;
      btn.dataset.number = s.number;
      btn.addEventListener('click', ()=> loadSurah(s.number, btn));
      listEl.appendChild(btn);
    });

    // search filter
    searchInput.addEventListener('input', (e)=>{
      const q = e.target.value.trim();
      Array.from(listEl.children).forEach(it=>{
        if(it.textContent.includes(q) || it.textContent.toLowerCase().includes(q.toLowerCase())){
          it.style.display = '';
        } else it.style.display = 'none';
      });
    });

  }catch(err){
    listEl.innerHTML = `<p class="muted">تعذر جلب السور من الخادم. تأكد من اتصال الإنترنت أو استخدم النسخة الأوفلاين.</p>`;
    console.error(err);
  }

  async function loadSurah(number, btnElement){
    // إبراز العنصر
    Array.from(listEl.children).forEach(c=>c.classList.remove('active'));
    btnElement.classList.add('active');
    contentEl.innerHTML = `<p class="muted">جارِ تحميل السورة...</p>`;
    try{
      // هنا نستخدم نسخة نصية (القرآن العثماني) — إن واجهة الـ API تتطلب تعديل، غيّر 'quran-uthmani' أو endpoint حسب الحاجة.
      const res = await fetch(`${API_BASE}/surah/${number}/quran-uthmani`);
      const d = await res.json();
      if(!d.data || !d.data.ayahs) throw new Error('لا بيانات');
      const s = d.data;
      let html = `<h3>${s.englishName} — ${s.name} (عدد الآيات: ${s.numberOfAyahs})</h3>`;
      html += `<div class="surah-text">`;
      s.ayahs.forEach(a=>{
        html += `<div class="ayah"><span class="aya-num">(${a.numberInSurah})</span> <span class="aya-text">${a.text}</span></div>`;
      });
      html += `</div>`;
      contentEl.innerHTML = html;
      contentEl.scrollTop = 0;
    }catch(e){
      contentEl.innerHTML = `<p class="muted">تعذّر تحميل نص السورة. يمكنك تجربة إعادة التحميل أو استخدام النسخة الأوفلاين.</p>`;
      console.error(e);
    }
  }
}

// ---------- Articles & Comments ----------
function initArticlesPage(){
  // modal for article details
  const modal = document.getElementById('article-modal');
  const modalContent = document.getElementById('modal-content');
  document.querySelectorAll('.read-more').forEach(a=>{
    a.addEventListener('click', e=>{
      const key = e.target.dataset.content;
      openArticle(key);
    });
  });
  document.getElementById('close-article').addEventListener('click', ()=> {
    modal.classList.add('hidden');
  });

  // sample content store (يمكنك تعديل/إضافة)
  const CONTENT = {
    hadith1: {
      title: 'حديث: فضل الصدقة',
      body: `<p>عن النبي ﷺ: «ما نقَصَتْ مَالًا مِنْ صدقةٍ...» — (نموذج نصي، ضع هنا النص والمصدر).</p>`
    },
    story1: {
      title: 'موقف نبوي ﷺ مع الصحابة',
      body: `<p>قصة تعليمية عن كيفية تعاطي النبي ﷺ مع الصحابة في مسألة التواضع والرحمة...</p>`
    }
  };

  function openArticle(key){
    const item = CONTENT[key];
    if(!item) return;
    modalContent.innerHTML = `<h3>${item.title}</h3>${item.body}`;
    modal.classList.remove('hidden');
  }

  // بحث المقالات
  const articleSearch = document.getElementById('article-search');
  articleSearch.addEventListener('input', (e)=>{
    const q = e.target.value.trim();
    Array.from(document.querySelectorAll('.card')).forEach(card=>{
      const txt = card.textContent || '';
      card.style.display = txt.includes(q) || txt.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
    });
  });

  // تعليقات (محلي)
  const form = document.getElementById('comment-form');
  const commentsList = document.getElementById('comments-list');
  const storageKey = 'mouiza_comments_v1';
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');

  function renderComments(){
    commentsList.innerHTML = '';
    const arr = JSON.parse(localStorage.getItem(storageKey) || '[]').reverse();
    if(arr.length===0) commentsList.innerHTML = `<p class="muted">لا تعليقات بعد — كن أول من يشارك.</p>`;
    arr.forEach(c=>{
      const d = document.createElement('div');
      d.className = 'comment';
      d.innerHTML = `<strong>${escapeHtml(c.name||'زائر')}</strong> <small class="muted">— ${new Date(c.time).toLocaleString()}</small><p>${escapeHtml(c.text)}</p>`;
      commentsList.appendChild(d);
    });
  }

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const name = document.getElementById('comment-name').value.trim();
    const text = document.getElementById('comment-text').value.trim();
    if(!text) return alert('اكتب تعليقًا أولاً');
    const arr = JSON.parse(localStorage.getItem(storageKey) || '[]');
    arr.push({name, text, time: Date.now()});
    localStorage.setItem(storageKey, JSON.stringify(arr));
    form.reset();
    renderComments();
  });

  renderComments();
}

// ----- helpers -----
function escapeHtml(str){
  if(!str) return '';
  return str.replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
}
