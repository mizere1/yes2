const GEMINI_API_KEY = "AIzaSyBy93HTPV7fk-XCUmukQJsWTxHcvYDWEeQ";
const YOUTUBE_API_KEY = "AIzaSyA0SxBg-UrxkRroy3lre6bziHFwFOAs3tI";

function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function load(key) { return JSON.parse(localStorage.getItem(key) || 'null'); }

async function fetchModuleNames(fieldOfStudy) {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{
      parts: [{
        text: `Generate a list of 10 specific module names for a ${fieldOfStudy} program. Return the list as a JSON array of strings.`
      }]
    }]
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (err) {
    console.error("Error fetching module names:", err);
    return [];
  }
}

async function fetchDailyTasks(moduleName) {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{
      parts: [{
        text: `Generate a list of 18 daily task titles for the university module "${moduleName}". Return as a JSON array of strings.`
      }]
    }]
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (err) {
    console.error("Error fetching daily tasks:", err);
    return [];
  }
}

async function fetchDailyExplanation(dailyTask) {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{
      parts: [{
        text: `Explain the module as a professor: "${dailyTask}". Include explanations, examples, and key points.`
      }]
    }]
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No detailed explanation available.';
  } catch (err) {
    console.error("Error fetching detailed explanation:", err);
    return 'No detailed explanation available due to an error.';
  }
}

async function fetchVideos(moduleName) {
  const q = encodeURIComponent(moduleName);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&videoDuration=long&maxResults=2&key=${YOUTUBE_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error("Error fetching videos:", err);
    return [];
  }
}

async function fetchReadingMaterials(moduleName) {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{
      parts: [{
        text: `List 5 suggested reading materials (books, articles) for the module "${moduleName}". Return as a JSON array of objects with 'title' and 'url'.`
      }]
    }]
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (err) {
    console.error("Error fetching reading materials:", err);
    return [];
  }
}

async function generateSchedule(programType, fieldOfStudy) {
  const startDate = new Date();
  const schedule = [];
  const totalModules = 10;
  const daysPerModule = 18;

  const moduleNames = await fetchModuleNames(fieldOfStudy);

  for (let i = 0; i < totalModules; i++) {
    const moduleName = moduleNames[i] || `${fieldOfStudy} Module ${i + 1}`;
    const dailyTasks = await fetchDailyTasks(moduleName);
    const moduleStart = new Date(startDate.getTime() + i * daysPerModule * 24 * 60 * 60 * 1000);

    const days = [];
    for (let j = 0; j < daysPerModule; j++) {
      const dayDate = new Date(moduleStart.getTime() + j * 24 * 60 * 60 * 1000);
      const task = dailyTasks[j] || `Day ${j + 1}: ${moduleName} Task`;
      days.push({
        day: j + 1,
        date: dayDate.toISOString().split('T')[0],
        task
      });
    }
    schedule.push({ moduleName, days });
  }
  return schedule;
}

const courseSection = document.getElementById('courseSection');
const scheduleSection = document.getElementById('scheduleSection');
const learningSection = document.getElementById('learningSection');
const semesterOutline = document.getElementById('semesterOutline');
const nextDayBtn = document.getElementById('nextDayBtn');
const progressBarInner = document.getElementById('progressBarInner');
const progressNote = document.getElementById('progressNote');
const dailyTaskTitle = document.getElementById('dailyTaskTitle');
const dailyExplanation = document.getElementById('dailyExplanation');
const videosContainer = document.getElementById('videos');
const exerciseSection = document.getElementById('exerciseSection');
const startBtn = document.getElementById('startBtn');
const startOverBtn = document.getElementById('startOverBtn');
const moduleInput = document.getElementById('moduleInput');
const submitModuleBtn = document.getElementById('submitModuleBtn');

function renderSemesterOutline(schedule) {
  semesterOutline.innerHTML = '';
  schedule.forEach((module, i) => {
    const moduleDiv = document.createElement('div');
    moduleDiv.innerHTML = `<strong>Module ${i + 1}:</strong> ${module.moduleName}`;
    semesterOutline.appendChild(moduleDiv);
  });
}

function renderProgress(dayIndex, totalDays) {
  const percent = totalDays > 0 ? Math.min(100, Math.round((dayIndex / totalDays) * 100)) : 0;
  progressBarInner.style.width = `${percent}%`;
  progressNote.textContent = `Progress: ${percent}%`;
}

async function renderDay(dayIndex) {
  const prog = load('program');
  if (!prog || !prog.schedule || !Array.isArray(prog.schedule) || prog.schedule.length === 0) {
    alert('No valid program loaded. Please start a new program.');
    courseSection.classList.remove('hidden');
    scheduleSection.classList.add('hidden');
    learningSection.classList.add('hidden');
    startOverBtn.classList.add('hidden');
    return;
  }

  const totalDays = prog.schedule.reduce((acc, mod) => acc + (mod.days?.length || 0), 0);
  console.log(`Rendering day ${dayIndex}, totalDays: ${totalDays}`);

  if (totalDays === 0) {
    alert('Invalid schedule: No days available. Please start over.');
    localStorage.removeItem('program');
    localStorage.removeItem('dayIndex');
    location.reload();
    return;
  }

  if (dayIndex >= totalDays) {
    alert('You have completed the program! Congratulations!');
    nextDayBtn.classList.add('hidden');
    return;
  }

  let currentDayCount = 0;
  let currentModule = null;
  let currentDay = null;

  for (const module of prog.schedule) {
    if (!module.days || !Array.isArray(module.days)) {
      console.warn(`Module ${module.moduleName} has no valid days array.`);
      continue;
    }
    if (dayIndex < currentDayCount + module.days.length) {
      currentModule = module;
      currentDay = module.days[dayIndex - currentDayCount];
      break;
    }
    currentDayCount += module.days.length;
  }

  if (!currentDay || !currentModule) {
    alert('Error: Could not find the current day or module. Please start over.');
    localStorage.removeItem('program');
    localStorage.removeItem('dayIndex');
    location.reload();
    return;
  }

  dailyTaskTitle.textContent = `Day ${currentDay.day} Task: ${currentDay.task}`;
  dailyExplanation.textContent = 'Enter a module to load content.';
  videosContainer.innerHTML = '';
  exerciseSection.innerHTML = '';
  moduleInput.classList.remove('hidden');
  submitModuleBtn.classList.remove('hidden');

  learningSection.classList.remove('hidden');
  scheduleSection.classList.remove('hidden');
  courseSection.classList.add('hidden');
  startOverBtn.classList.remove('hidden');

  renderSemesterOutline(prog.schedule);
  renderProgress(dayIndex, totalDays);

  submitModuleBtn.onclick = async () => {
    const selectedModule = moduleInput.value.trim();
    if (!selectedModule) {
      alert('Please enter a module name.');
      return;
    }

    dailyExplanation.textContent = 'Loading detailed explanation...';
    videosContainer.innerHTML = 'Loading videos...';
    exerciseSection.innerHTML = 'Loading suggested reading materials...';

    try {
      const detailedExplanation = await fetchDailyExplanation(currentDay.task);
      dailyExplanation.textContent = detailedExplanation;
    } catch (err) {
      console.error(err);
      dailyExplanation.textContent = 'Failed to load detailed explanation.';
    }

    try {
      const vids = await fetchVideos(selectedModule);
      videosContainer.innerHTML = '';
      if (vids.length) {
        vids.forEach(v => {
          if (v.id?.videoId) {
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${v.id.videoId}`;
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
            iframe.allowFullscreen = true;
            videosContainer.appendChild(iframe);
          }
        });
      } else {
        videosContainer.textContent = 'No videos found.';
      }
    } catch (err) {
      console.error(err);
      videosContainer.textContent = 'Error loading videos.';
    }

    try {
      const readings = await fetchReadingMaterials(selectedModule);
      if (readings.length) {
        let listHTML = '<ul>';
        readings.forEach(r => {
          listHTML += `<li><a href="${r.url}" target="_blank" rel="noopener">${r.title}</a></li>`;
        });
        listHTML += '</ul>';
        exerciseSection.innerHTML = listHTML;
      } else {
        exerciseSection.innerHTML = '<p>No suggested reading materials found.</p>';
      }
    } catch (err) {
      console.error(err);
      exerciseSection.textContent = 'Error loading reading materials.';
    }
  };

  nextDayBtn.classList.toggle('hidden', dayIndex >= totalDays - 1);
  save('dayIndex', dayIndex);
}

startBtn.addEventListener('click', async () => {
  const type = document.getElementById('courseType').value;
  const field = document.getElementById('fieldInput').value.trim();
  if (!type || !field) {
    alert('Please select a program type and enter a field of study.');
    return;
  }

  startBtn.disabled = true;
  document.getElementById('loadingCircle').style.display = 'block';

  try {
    const schedule = await generateSchedule(type, field);
    if (schedule.length === 0 || schedule.some(mod => !mod.days || mod.days.length === 0)) {
      alert('Failed to generate a valid schedule. Please try again.');
      return;
    }

    save('program', { type, field, schedule });
    save('dayIndex', 0);
    renderDay(0);
  } catch (err) {
    console.error(err);
    alert('An error occurred while generating the schedule.');
  } finally {
    startBtn.disabled = false;
    document.getElementById('loadingCircle').style.display = 'none';
  }
});

nextDayBtn.addEventListener('click', () => {
  let dayIndex = load('dayIndex') || 0;
  dayIndex++;
  renderDay(dayIndex);
});

startOverBtn.addEventListener('click', () => {
  localStorage.removeItem('program');
  localStorage.removeItem('dayIndex');
  location.reload();
});

window.addEventListener('DOMContentLoaded', () => {
  const prog = load('program');
  const dayIndex = load('dayIndex');
  if (prog && dayIndex !== null && Number.isInteger(dayIndex) && dayIndex >= 0) {
    renderDay(dayIndex);
  }
});
