document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('game-grid');

    // Fetch the JSON file
    fetch('games.json')
        .then(response => {
            if (!response.ok) throw new Error("Could not load games.json");
            return response.json();
        })
        .then(games => {
            // Clear loading message
            grid.innerHTML = '';

            // Build each card
            games.forEach(game => {
                const card = document.createElement('div');
                card.className = 'game-card';

                card.innerHTML = `
                    <div>
                        <h2>${game.title}</h2>
                        <p>${game.description}</p>
                    </div>
                    <a href="${game.path}" class="play-btn">PLAY</a>
                `;

                grid.appendChild(card);
            });
        })
        .catch(err => {
            grid.innerHTML = `<p class="loading">Error: ${err.message}</p>`;
            console.error(err);
        })
        
});