
// Dark mode persistence
(function(){
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const key = 'taara-theme';
  function apply(mode){
    if(mode === 'dark'){ root.classList.add('dark'); }
    else{ root.classList.remove('dark'); }
    localStorage.setItem(key, mode);
  }
  const saved = localStorage.getItem(key);
  if(saved){ apply(saved); }
  if(toggle){
    toggle.addEventListener('click', () => {
      const next = root.classList.contains('dark') ? 'light' : 'dark';
      apply(next);
    });
  }
  // Footer year
  const y = document.getElementById('year'); if(y){ y.textContent = new Date().getFullYear(); }
})();

// Scroll reveal animation
(function(){
  const els = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){ e.target.classList.add('is-visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.2 });
  els.forEach(el => io.observe(el));
})();

// Adoption modal logic (if on adoption page)
(function(){
  const modal = document.getElementById('petModal');
  if(!modal) return;
  const backdrop = modal.querySelector('.modal-backdrop');
  const closeBtn = modal.querySelector('.modal-close');
  const img = document.getElementById('modalImg');
  const title = document.getElementById('modalTitle');
  const species = document.getElementById('modalSpecies');
  const breed = document.getElementById('modalBreed');
  const age = document.getElementById('modalAge');
  const gender = document.getElementById('modalGender');
  const personality = document.getElementById('modalPersonality');
  const adoptBtn = document.getElementById('adoptBtn');

  function openModal(data){
    img.src = (data.img && (data.img.includes('unsplash.com') || data.img.includes('pexels.com'))) 
      ? data.img + "&q=80&w=1000&auto=format&fit=crop" 
      : data.img;
    img.alt = data.name;
    title.textContent = data.name;
    species.textContent = data.species;
    breed.textContent = data.breed;
    age.textContent = data.age;
    gender.textContent = data.gender;
    personality.textContent = data.personality;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('click', (e) => {
    const card = e.target.closest('.pet-card');
    if(card){
      const data = {
        name: card.dataset.name,
        img: card.dataset.img,
        breed: card.dataset.breed,
        age: card.dataset.age,
        gender: card.dataset.gender,
        personality: card.dataset.personality,
        species: card.dataset.species
      };
      openModal(data);
    }
    if(e.target.classList.contains('view-details')){
      e.preventDefault();
    }
    if(e.target === backdrop || e.target.classList.contains('modal-close')){
      closeModal();
    }
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') closeModal();
  });
  if(adoptBtn){
    adoptBtn.addEventListener('click', ()=>{
      alert('Thanks for your interest! Adoption functionality will be added soon.');
    });
  }
})();

// Rescue page: Use My Location + preview media
(function(){
  const useBtn = document.getElementById('useLocation');
  const locInput = document.getElementById('locationInput');
  const map = document.getElementById('mapFrame');
  const form = document.getElementById('rescueForm');
  const msg = document.getElementById('formMsg');
  if(useBtn && locInput){
    useBtn.addEventListener('click', () => {
      if(!navigator.geolocation){
        alert('Geolocation is not supported by your browser.');
        return;
      }
      useBtn.disabled = true;
      useBtn.textContent = 'Getting location...';
      navigator.geolocation.getCurrentPosition((pos)=>{
        const { latitude, longitude } = pos.coords;
        const coords = latitude.toFixed(5) + ', ' + longitude.toFixed(5);
        locInput.value = coords;
        if(map){
          map.src = `https://www.google.com/maps?q=${latitude},${longitude}&output=embed`;
        }
        useBtn.textContent = 'Use My Location';
        useBtn.disabled = false;
      }, (err)=>{
        alert('Could not get your location. Please enter it manually.');
        useBtn.textContent = 'Use My Location';
        useBtn.disabled = false;
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });
  }
  if(form && msg){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      msg.textContent = 'Rescue request submitted. We will reach out to you shortly.';
      form.reset();
    });
  }

  const mediaInput = document.getElementById('mediaInput');
  const preview = document.getElementById('mediaPreview');
  if(mediaInput && preview){
    mediaInput.addEventListener('change', ()=>{
      preview.innerHTML = '';
      const file = mediaInput.files && mediaInput.files[0];
      if(!file) return;
      const url = URL.createObjectURL(file);
      if(file.type.startsWith('image/')){
        const img = document.createElement('img');
        img.src = url; img.alt = 'Uploaded image preview';
        preview.appendChild(img);
      }else if(file.type.startsWith('video/')){
        const vid = document.createElement('video');
        vid.src = url; vid.controls = true;
        preview.appendChild(vid);
      }
    });
  }
})();
