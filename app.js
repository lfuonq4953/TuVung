// State management
let vocabSets = [];
let activeSetId = null;
let currentIndex = 0;
let audio = new Audio();

// DOM Elements
const elements = {
    uploadSection: document.getElementById('uploadSection'),
    vocabSetsList: document.getElementById('vocabSetsList'),
    learningSection: document.getElementById('learningSection'),
    emptyState: document.getElementById('emptyState'),
    setName: document.getElementById('setName'),
    excelFile: document.getElementById('excelFile'),
    audioFiles: document.getElementById('audioFiles'),
    excelFileName: document.getElementById('excelFileName'),
    audioFileName: document.getElementById('audioFileName'),
    createSetBtn: document.getElementById('createSetBtn'),
    addNewSetBtn: document.getElementById('addNewSetBtn'),
    startBtn: document.getElementById('startBtn'),
    setsContainer: document.getElementById('setsContainer'),
    flashcard: document.getElementById('flashcard'),
    wordEnglish: document.getElementById('wordEnglish'),
    wordVietnamese: document.getElementById('wordVietnamese'),
    wordExample: document.getElementById('wordExample'),
    progress: document.getElementById('progress'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    wordPosFront: document.getElementById('wordPosFront'),
    wordPronFront: document.getElementById('wordPronFront'),
    wordPosBack: document.getElementById('wordPosBack'),
    wordPronBack: document.getElementById('wordPronBack'),
    playAudioBtn: document.getElementById('playAudioBtn')
};

// Initialize
function init() {
    loadFromLocalStorage();
    setupEventListeners();
    updateUI();
}

// Event Listeners
function setupEventListeners() {
    elements.excelFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            elements.excelFileName.textContent = file.name;
            if (!elements.setName.value) {
                elements.setName.value = file.name.replace(/\.(xlsx|xls)$/, '');
            }
        }
    });

    elements.audioFiles.addEventListener('change', (e) => {
        const count = e.target.files.length;
        elements.audioFileName.textContent = count > 0 ? `${count} files` : 'Upload file audio';
    });

    elements.createSetBtn.addEventListener('click', createVocabSet);
    elements.addNewSetBtn.addEventListener('click', showUploadSection);
    elements.startBtn.addEventListener('click', showUploadSection);
    elements.flashcard.addEventListener('click', () => {
    elements.flashcard.classList.toggle('flipped');
    });
    elements.prevBtn.addEventListener('click', prevWord);
    elements.nextBtn.addEventListener('click', nextWord);
    elements.playAudioBtn.addEventListener('click', playAudio);
}

// Create vocab set
async function createVocabSet() {
    const name = elements.setName.value.trim();
    const excelFile = elements.excelFile.files[0];
    const audioFiles = Array.from(elements.audioFiles.files);

    if (!name || !excelFile || audioFiles.length === 0) {
        alert('Vui lòng điền đầy đủ thông tin!');
        return;
    }

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            const words = [];
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (row[0]) {
                    const audioFileName = `tu_${String(i).padStart(3, '0')}.wav`;
                    const audioFile = audioFiles.find(f => f.name === audioFileName || f.name === audioFileName.replace('.wav', '.mp3'));
                    
                    let audioUrl = null;
                    if (audioFile) {
                        audioUrl = URL.createObjectURL(audioFile);
                    }

                    words.push({
                        id: i,
                        english: row[1] || '',
                        pos: row[2] || '',
                        pronunciation: row[3] || '',
                        vietnamese: row[4] || '',
                        audioUrl: audioUrl
                    });

                }
            }

            const newSet = {
                id: Date.now(),
                name: name,
                words: words
            };

            vocabSets.push(newSet);
            saveToLocalStorage();
            selectSet(newSet.id);
            resetUploadForm();
            updateUI();
        };
        reader.readAsArrayBuffer(excelFile);
    } catch (error) {
        alert('Có lỗi xảy ra: ' + error.message);
    }
}

// UI Updates
function updateUI() {
    if (vocabSets.length === 0) {
        elements.emptyState.style.display = 'block';
        elements.vocabSetsList.style.display = 'none';
        elements.learningSection.style.display = 'none';
        elements.uploadSection.style.display = 'none';
    } else {
        elements.emptyState.style.display = 'none';
        elements.vocabSetsList.style.display = 'block';
        renderVocabSets();
        
        if (activeSetId) {
            elements.learningSection.style.display = 'block';
            elements.uploadSection.style.display = 'none';
            updateFlashcard();
        }
    }
}

function renderVocabSets() {
    elements.setsContainer.innerHTML = vocabSets.map(set => `
        <div class="set-item ${set.id === activeSetId ? 'active' : ''}" onclick="selectSet(${set.id})">
            <div class="set-item-header">
                <div>
                    <h3>${set.name}</h3>
                    <p>${set.words.length} từ vựng</p>
                </div>
                <button class="btn delete-btn" onclick="event.stopPropagation(); deleteSet(${set.id})">Xóa</button>
            </div>
        </div>
    `).join('');
}

function updateFlashcard() {
    const activeSet = vocabSets.find(s => s.id === activeSetId);
    if (!activeSet || activeSet.words.length === 0) return;

    const word = activeSet.words[currentIndex];
    elements.wordEnglish.textContent = word.english;
    elements.wordVietnamese.textContent = word.vietnamese;
    elements.wordExample.textContent = word.example;
    elements.progress.textContent = `${currentIndex + 1} / ${activeSet.words.length}`;
    elements.wordPosFront.textContent = word.pos || '';
    elements.wordPronFront.textContent = word.pronunciation || '';

    elements.wordPosBack.textContent = word.pos || '';
    elements.wordPronBack.textContent = word.pronunciation || '';

    elements.prevBtn.disabled = currentIndex === 0;
    elements.nextBtn.disabled = currentIndex === activeSet.words.length - 1;

}

// Actions
function selectSet(setId) {
    activeSetId = setId;
    currentIndex = 0;
    updateUI();
}

function deleteSet(setId) {
    if (confirm('Bạn có chắc muốn xóa bộ từ này?')) {
        vocabSets = vocabSets.filter(s => s.id !== setId);
        if (activeSetId === setId) {
            activeSetId = null;
        }
        saveToLocalStorage();
        updateUI();
    }
}

function showUploadSection() {
    elements.uploadSection.style.display = 'block';
    elements.learningSection.style.display = 'none';
}


function prevWord() {
    if (currentIndex > 0) {
        currentIndex--;
        updateFlashcard();
    }
}

function nextWord() {
    const activeSet = vocabSets.find(s => s.id === activeSetId);
    if (currentIndex < activeSet.words.length - 1) {
        currentIndex++;
        updateFlashcard();
    }
}

function playAudio() {
    const activeSet = vocabSets.find(s => s.id === activeSetId);
    const word = activeSet.words[currentIndex];
    
    if (word.audioUrl) {
        audio.src = word.audioUrl;
        audio.play();
        elements.playAudioBtn.textContent = '⏸ Dừng';
        audio.onended = () => {
            elements.playAudioBtn.textContent = '▶ Phát âm';
        };
    } else {
        alert('Không có file âm thanh!');
    }
}

function resetUploadForm() {
    elements.setName.value = '';
    elements.excelFile.value = '';
    elements.audioFiles.value = '';
    elements.excelFileName.textContent = 'Upload file Excel';
    elements.audioFileName.textContent = 'Upload file audio';
}

// Local Storage
function saveToLocalStorage() {
    // Lưu metadata, không lưu audio URLs
    const setsToSave = vocabSets.map(set => ({
        ...set,
        words: set.words.map(w => ({...w, audioUrl: null}))
    }));
    localStorage.setItem('vocabSets', JSON.stringify(setsToSave));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('vocabSets');
    if (saved) {
        vocabSets = JSON.parse(saved);
    }
}

// Start app
init();