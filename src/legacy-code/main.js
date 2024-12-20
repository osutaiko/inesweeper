document.addEventListener('DOMContentLoaded', () => {
    const githubButton = document.getElementById('github-button');
    const myTimesButton = document.getElementById('mytimes-button');
    const helpButton = document.getElementById('help-button');
    const settingsButton = document.getElementById('settings-button');
    const closeModalButton = [...document.getElementsByClassName('close')];

    const myTimesModal = document.getElementById('modal-mytimes');
    const helpModal = document.getElementById('modal-help');
    const settingsModal = document.getElementById('modal-settings');

    const toggleLocationSelect = document.getElementById('toggle-location');
    const gridSizeSlider = document.getElementById('grid-size-slider');
    const gridSizeDisplay = document.getElementById('grid-size-display');
    const boardElement = document.querySelector('.board');
    const infoBar = document.querySelector('.board-info-bar');
    const defaultSettingsButton = document.getElementById('default-settings');

    githubButton.addEventListener('click', () => {
        window.location.href = "https://github.com/osutaiko/osutaiko.github.io";
    });

    myTimesButton.addEventListener('click', () => {
        myTimesModal.style.display = 'block';
    });

    helpButton.addEventListener('click', () => {
        helpModal.style.display = 'block';
    });

    settingsButton.addEventListener('click', () => {
        settingsModal.style.display = 'block';
    });

    closeModalButton.forEach(button => {
        button.addEventListener('click', () => {
            myTimesModal.style.display = 'none';
            helpModal.style.display = 'none';
            settingsModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target == myTimesModal || event.target == helpModal || event.target == settingsModal) {
            myTimesModal.style.display = 'none';
            helpModal.style.display = 'none';
            settingsModal.style.display = 'none';
        }
    });

    const toggleLocation = localStorage.getItem('toggleLocation') || 'bottom-right';
    toggleLocationSelect.value = toggleLocation;

    function updateToggleButtonLocation(location) {
        const toggleButton = document.getElementById('toggle-button');
        toggleButton.classList.remove('bottom-right', 'bottom-left', 'center-right', 'center-left');
        toggleButton.classList.add(location);
    }

    toggleLocationSelect.addEventListener('change', () => {
        const selectedLocation = toggleLocationSelect.value;
        localStorage.setItem('toggleLocation', selectedLocation);
        updateToggleButtonLocation(selectedLocation);
    });

    updateToggleButtonLocation(toggleLocation);

    let gridSize = parseInt(localStorage.getItem('gridSize')) || 25;
    gridSizeSlider.value = gridSize;
    gridSizeDisplay.textContent = gridSize;

    function updateGridSize(size) {
        gridSize = size;
        localStorage.setItem('gridSize', size);

        const boardWidth = parseInt(getComputedStyle(boardElement).getPropertyValue('--board-width'));
        const boardHeight = parseInt(getComputedStyle(boardElement).getPropertyValue('--board-height'));

        boardElement.style.setProperty('--grid-size', `${size}px`);
        boardElement.style.gridTemplateColumns = `repeat(${boardWidth}, ${size}px)`;
        boardElement.style.gridTemplateRows = `repeat(${boardHeight}, ${size}px)`;

        const boardWidthPixels = size * boardWidth;
        infoBar.style.width = `${boardWidthPixels + 10}px`;
        gridSizeDisplay.textContent = size;
    }

    gridSizeSlider.addEventListener('input', function() {
        const selectedSize = parseInt(gridSizeSlider.value);
        updateGridSize(selectedSize);
    });

    window.addEventListener('load', function() {
        updateGridSize(gridSize);
    });

    updateGridSize(gridSize);

    defaultSettingsButton.addEventListener('click', function() {
        localStorage.removeItem('toggleLocation');
        localStorage.removeItem('gridSize');
        location.reload(false);
    });
    
    var storageKeys = [
        'classic-beginner-time',
        'classic-intermediate-time',
        'classic-expert-time',
        'multimines-beginner-time',
        'multimines-intermediate-time',
        'multimines-expert-time',
        'omega-beginner-time',
        'omega-intermediate-time',
        'omega-expert-time',
        'liar-beginner-time',
        'liar-intermediate-time',
        'liar-expert-time'
    ];
    
    for (var i = 0; i < storageKeys.length; i++) {
        document.getElementById(storageKeys[i]).textContent = localStorage.getItem(storageKeys[i]) || 'N/A';
    }
});
