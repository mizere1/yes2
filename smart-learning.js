document.addEventListener('DOMContentLoaded', () => {
    const smartLearningSection = document.getElementById('smart-learning-section');
    const smartLearningBtn = document.getElementById('smart-learning-btn');
    const smartLearningCode = document.getElementById('smart-learning-code');
    const learningContent = document.getElementById('learning-content');
    const userProfileSection = document.getElementById('user-profile');
    const startOverBtn = document.getElementById('startOverBtn');

    smartLearningBtn.addEventListener('click', () => {
        if (smartLearningCode.value === '010101') {
            learningContent.classList.remove('hidden');
            userProfileSection.classList.add('hidden');
            smartLearningCode.classList.add('hidden');
            smartLearningBtn.classList.add('hidden');
            startOverBtn.classList.remove('hidden');
        } else {
            alert('Incorrect access code.');
        }
    });

    startOverBtn.addEventListener('click', () => {
        learningContent.classList.add('hidden');
        userProfileSection.classList.remove('hidden');
        smartLearningCode.classList.remove('hidden');
        smartLearningBtn.classList.remove('hidden');
        startOverBtn.classList.add('hidden');
        smartLearningCode.value = '';
    });
});
