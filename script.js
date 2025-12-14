// Global state
let selectedParts = new Set();
let allQuestions = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let correctAnswers = [];

// DOM elements
const openingWindow = document.getElementById('openingWindow');
const testWindow = document.getElementById('testWindow');
const resultsWindow = document.getElementById('resultsWindow');
const partButtons = document.querySelectorAll('.part-btn');
const selectAllBtn = document.getElementById('selectAllBtn');
const startBtn = document.getElementById('startBtn');
const limitToggles = document.querySelectorAll('.limit-toggle');
const decreaseLimitBtn = document.getElementById('decreaseLimitBtn');
const increaseLimitBtn = document.getElementById('increaseLimitBtn');
const toggleContainer = document.getElementById('toggleContainer');
const darkModeToggle = document.getElementById('darkModeToggle');
const darkModeToggleTest = document.getElementById('darkModeToggleTest');
const nextBtn = document.getElementById('nextBtn');
const questionText = document.getElementById('questionText');
const answersContainer = document.getElementById('answersContainer');
const questionNumber = document.getElementById('questionNumber');
const progressFill = document.getElementById('progressFill');
const restartBtn = document.getElementById('restartBtn');
const correctCount = document.getElementById('correctCount');
const incorrectCount = document.getElementById('incorrectCount');

const totalCount = document.getElementById('totalCount');
const selectedCountValue = document.getElementById('selectedCountValue');

// Dark mode functionality
function initDarkMode() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateDarkModeIcon(theme);
}

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateDarkModeIcon(newTheme);
}

function updateDarkModeIcon(theme) {
    const icons = document.querySelectorAll('.dark-mode-icon');
    icons.forEach(icon => {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
}

// Part selection
partButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const part = btn.dataset.part;
        if (selectedParts.has(part)) {
            selectedParts.delete(part);
            btn.classList.remove('selected');
        } else {
            selectedParts.add(part);
            btn.classList.add('selected');
        }
        updateStartButton();
        updateStartButton();
        updateToggleVisibility();
        updateSelectedCount();
    });
});

selectAllBtn.addEventListener('click', () => {
    if (selectedParts.size === 8) {
        selectedParts.clear();
        partButtons.forEach(btn => btn.classList.remove('selected'));
    } else {
        selectedParts.clear();
        partButtons.forEach(btn => {
            const part = btn.dataset.part;
            selectedParts.add(part);
            btn.classList.add('selected');
        });
    }
    updateStartButton();
    updateStartButton();
    updateToggleVisibility();
    updateSelectedCount();
});

function updateStartButton() {
    startBtn.disabled = selectedParts.size === 0;
    selectAllBtn.textContent = selectedParts.size === 8 ? 'Hamsını seç' : 'Hamsını seç';
}

function updateToggleVisibility() {
    if (selectedParts.size > 1) {
        toggleContainer.style.display = 'block';
    } else {
        toggleContainer.style.display = 'none';
        toggleContainer.style.display = 'none';
        limitToggles.forEach(toggle => {
            toggle.checked = false;
            // Reset labels to default values
            const limit = toggle.dataset.limit;
            const labelSpan = toggle.parentElement.querySelector('span');
            labelSpan.textContent = `${limit} suala limitle`;
            toggle.dataset.currentLimit = limit;
        });
    }
}

// Load questions from test files
async function loadQuestions() {
    allQuestions = [];
    const loadPromises = Array.from(selectedParts).map(async (part) => {
        try {
            let response = await fetch(`test${part}.js`);
            if (!response.ok) {
                response = await fetch(`test${part}.json`);
            }
            if (!response.ok) {
                response = await fetch(`part${part}.json`);
            }
            if (!response.ok) throw new Error(`Failed to load test${part}.js`);

            const text = await response.text();
            let data;

            try {
                data = JSON.parse(text);
            } catch (e) {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    data = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('Could not parse file as JSON');
                }
            }

            const questions = Array.isArray(data) ? data : (data.questions || []);

            const questionsWithPart = questions.map(q => {
                return {
                    question: q.question,
                    options: q.options || q.answers || [],
                    correct_answer: q.correct_answer || q.correct,
                    part: part
                };
            });
            return questionsWithPart;
        } catch (error) {
            console.error(`Error loading test${part}.js:`, error);
            return [];
        }
    });

    const questionArrays = await Promise.all(loadPromises);
    allQuestions = questionArrays.flat();
}

// Shuffle array function
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Start test
startBtn.addEventListener('click', async () => {
    if (selectedParts.size === 0) return;

    await loadQuestions();

    currentQuestions = shuffleArray(allQuestions);

    const activeToggle = Array.from(limitToggles).find(t => t.checked);
    if (selectedParts.size > 1 && activeToggle) {
        let limit = parseInt(activeToggle.dataset.currentLimit || activeToggle.dataset.limit);
        currentQuestions = currentQuestions.slice(0, limit);
    }

    currentQuestionIndex = 0;
    userAnswers = [];
    correctAnswers = [];

    openingWindow.classList.remove('active');
    testWindow.classList.add('active');

    displayQuestion();
});

// Display question
function displayQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        showResults();
        return;
    }

    const question = currentQuestions[currentQuestionIndex];
    questionText.textContent = question.question;
    questionNumber.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;

    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    progressFill.style.width = `${progress}%`;

    answersContainer.innerHTML = '';

    const options = question.options || question.answers || [];

    options.forEach((option) => {
        const answerBtn = document.createElement('button');
        answerBtn.className = 'answer-btn';
        answerBtn.textContent = option;
        answerBtn.dataset.answer = option;
        const correctAnswer = question.correct_answer || question.correct;
        answerBtn.addEventListener('click', () => selectAnswer(option, correctAnswer));
        answersContainer.appendChild(answerBtn);
    });

    nextBtn.disabled = true;
    nextBtn.style.display = 'none';
}

// Select answer
function selectAnswer(selectedAnswer, correctAnswer) {
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach(btn => {
        btn.classList.add('answered');
        btn.disabled = true;

        if (btn.dataset.answer === correctAnswer) {
            btn.classList.add('correct');
        } else if (btn.dataset.answer === selectedAnswer && selectedAnswer !== correctAnswer) {
            btn.classList.add('incorrect');
        }
    });

    userAnswers.push(selectedAnswer);
    correctAnswers.push(correctAnswer);

    nextBtn.disabled = false;
    nextBtn.style.display = 'block';
}

// Next question
nextBtn.addEventListener('click', () => {
    currentQuestionIndex++;
    displayQuestion();
});

// Show results
function showResults() {
    let correct = 0;
    let incorrect = 0;

    for (let i = 0; i < userAnswers.length; i++) {
        if (userAnswers[i] === correctAnswers[i]) {
            correct++;
        } else {
            incorrect++;
        }
    }

    correctCount.textContent = correct;
    incorrectCount.textContent = incorrect;
    totalCount.textContent = userAnswers.length;

    testWindow.classList.remove('active');
    resultsWindow.classList.add('active');
}

// Restart
restartBtn.addEventListener('click', () => {
    selectedParts.clear();
    partButtons.forEach(btn => btn.classList.remove('selected'));
    updateStartButton();
    updateToggleVisibility();
    updateToggleVisibility();
    updateSelectedCount();
    limitToggles.forEach(t => t.checked = false);

    resultsWindow.classList.remove('active');
    openingWindow.classList.add('active');
});

// Limit Toggles Logic
limitToggles.forEach(toggle => {
    // Initialize current limit data attribute
    toggle.dataset.currentLimit = toggle.dataset.limit;

    toggle.addEventListener('change', () => {
        if (toggle.checked) {
            // Uncheck and reset other toggles
            limitToggles.forEach(otherToggle => {
                if (otherToggle !== toggle) {
                    otherToggle.checked = false;
                    resetToggle(otherToggle);
                }
            });
        } else {
            // Reset itself when unchecked
            resetToggle(toggle);
        }
        updateSelectedCount();
    });
});

function resetToggle(t) {
    const originalLimit = t.dataset.limit;
    t.dataset.currentLimit = originalLimit;
    const label = t.parentElement.querySelector('span');
    label.textContent = `${originalLimit} suala limitle`;
}

// Limit Adjustment Logic
function adjustLimit(amount) {
    const activeToggle = Array.from(limitToggles).find(t => t.checked);
    if (!activeToggle) return; // Do nothing if no limit is selected

    let currentLimit = parseInt(activeToggle.dataset.currentLimit || activeToggle.dataset.limit);
    let newLimit = currentLimit + amount;

    // Minimum limit check (e.g., don't go below 10 or 0)
    if (newLimit < 10) newLimit = 10;

    // Update state and UI
    activeToggle.dataset.currentLimit = newLimit;
    const labelSpan = activeToggle.parentElement.querySelector('span');
    labelSpan.textContent = `${newLimit} suala limitle`;
    updateSelectedCount();
}

function getPartQuestionCount(partId) {
    const btn = document.querySelector(`.part-btn[data-part="${partId}"]`);
    if (!btn) return 0;
    const countText = btn.querySelector('.part-questions').textContent;
    return parseInt(countText) || 0;
}

function updateSelectedCount() {
    let totalQuestions = 0;
    selectedParts.forEach(partId => {
        totalQuestions += getPartQuestionCount(partId);
    });

    const activeToggle = Array.from(limitToggles).find(t => t.checked);
    if (activeToggle && selectedParts.size > 1) { // Limit applies only if > 1 part selected as per existing logic, or applies always? existing logic says > 1
        // Existing logic: if (selectedParts.size > 1 && activeToggle) ...
        // So display should reflect that logic
        let limit = parseInt(activeToggle.dataset.currentLimit || activeToggle.dataset.limit);
        if (totalQuestions > limit) {
            totalQuestions = limit;
        }
    }

    selectedCountValue.textContent = totalQuestions;
}

decreaseLimitBtn.addEventListener('click', () => adjustLimit(-50));
increaseLimitBtn.addEventListener('click', () => adjustLimit(50));

// Dark mode toggles
darkModeToggle.addEventListener('click', toggleDarkMode);
darkModeToggleTest.addEventListener('click', toggleDarkMode);

// Initialize
initDarkMode();
updateStartButton();
updateSelectedCount();
