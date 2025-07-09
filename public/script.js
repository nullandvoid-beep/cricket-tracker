const API_BASE_URL = 'http://localhost:5000/api';

const liveMatchesContainer = document.getElementById('live-matches');
const liveMatchesTab = document.getElementById('live-matches-container');
const upcomingMatchesTab = document.getElementById('upcoming-matches-container');
const recentMatchesTab = document.getElementById('recent-matches-container');
const playersTable = document.getElementById('players-table');

document.addEventListener('DOMContentLoaded', async () => {
  const path = window.location.pathname;

  if (path.includes('index.html') || path === '/') {
    await loadLiveMatches();
  } else if (path.includes('matches.html')) {
    await loadAllMatches();
  } else if (path.includes('players.html')) {
    await loadPlayers();
  } else if (path.includes('match-details.html')) {
    await loadMatchPlayers();
  }
});

async function loadLiveMatches() {
  try {
    const response = await fetch(`${API_BASE_URL}/matches/live`);
    const data = await response.json();

    if (data.typeMatches?.length > 0) {
      let html = '';
      data.typeMatches.forEach(typeMatch => {
        typeMatch.seriesMatches?.forEach(series => {
          series.seriesAdWrapper?.matches?.forEach(match => {
            html += createMatchCard(match);
          });
        });
      });
      liveMatchesContainer.innerHTML = html || '<p>No live matches currently</p>';
    } else {
      liveMatchesContainer.innerHTML = '<p>No live matches currently</p>';
    }
  } catch (error) {
    console.error('Error fetching live matches:', error);
    liveMatchesContainer.innerHTML = '<p>Error loading matches. Please try again later.</p>';
  }
}

async function loadAllMatches() {
  try {
    const [liveRes, upcomingRes, recentRes] = await Promise.all([
      fetch(`${API_BASE_URL}/matches/live`),
      fetch(`${API_BASE_URL}/matches/upcoming`),
      fetch(`${API_BASE_URL}/matches/recent`)
    ]);

    const [liveData, upcomingData, recentData] = await Promise.all([
      liveRes.json(),
      upcomingRes.json(),
      recentRes.json()
    ]);

    renderMatchSection(liveData, liveMatchesTab, 'No live matches currently');
    renderMatchSection(upcomingData, upcomingMatchesTab, 'No upcoming matches scheduled');
    renderMatchSection(recentData, recentMatchesTab, 'No recent matches found');

  } catch (error) {
    console.error('Error fetching matches:', error);
    liveMatchesTab.innerHTML = upcomingMatchesTab.innerHTML = recentMatchesTab.innerHTML =
      '<p>Error loading matches. Please try again later.</p>';
  }
}

function renderMatchSection(data, container, emptyText) {
  if (data.typeMatches?.length > 0) {
    let html = '';
    data.typeMatches.forEach(typeMatch => {
      typeMatch.seriesMatches?.forEach(series => {
        series.seriesAdWrapper?.matches?.forEach(match => {
          html += createMatchCard(match);
        });
      });
    });
    container.innerHTML = html || `<p>${emptyText}</p>`;
  } else {
    container.innerHTML = `<p>${emptyText}</p>`;
  }
}

async function loadPlayers() {
  try {
    const response = await fetch(`${API_BASE_URL}/players/trending`);
    const data = await response.json();

    if (data.player?.length > 0) {
      playersTable.innerHTML = data.player.map((player, i) => `
        <tr>
          <td>${i + 1}. ${player.name}</td>
          <td>${player.teamName}</td>
          <td>${player.matches || '-'}</td>
          <td>${player.runs || '-'}</td>
          <td>${player.wickets || '-'}</td>
          <td>${player.average || '-'}</td>
        </tr>
      `).join('');
    } else {
      playersTable.innerHTML = '<tr><td colspan="6">No players found</td></tr>';
    }
  } catch (error) {
    console.error('Error fetching players:', error);
    playersTable.innerHTML = '<tr><td colspan="6">Error loading players. Please try again later.</td></tr>';
  }
}

async function loadMatchPlayers() {
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = urlParams.get('matchId');
  const team1Name = decodeURIComponent(urlParams.get('team1') || 'Team 1');
  const team2Name = decodeURIComponent(urlParams.get('team2') || 'Team 2');

  if (!matchId) {
    alert('No match ID provided. Redirecting to matches page.');
    window.location.href = 'matches.html';
    return;
  }

  document.getElementById('match-title').textContent = `${team1Name} vs ${team2Name} - Players`;
  document.getElementById('team1-name').textContent = team1Name;
  document.getElementById('team2-name').textContent = team2Name;

  try {
    const [team1, team2] = await Promise.all([
      fetchTeamPlayers(matchId, urlParams.get('team1Id')),
      fetchTeamPlayers(matchId, urlParams.get('team2Id'))
    ]);

    displayPlayers(team1, 'team1-players');
    displayPlayers(team2, 'team2-players');
  } catch (error) {
    console.error('Error loading players:', error);
    showError('team1-players');
    showError('team2-players');
  }
}

async function fetchTeamPlayers(matchId, teamId) {
  if (!teamId) throw new Error('Team ID not provided');
  const response = await fetch(`${API_BASE_URL}/team/${matchId}/${teamId}`);
  if (!response.ok) throw new Error('Failed to fetch players');
  const data = await response.json();
  return data.players?.['playing XI'] || [];
}

function displayPlayers(players, elementId) {
  const container = document.getElementById(elementId);
  container.innerHTML = '';

  if (!players || players.length === 0) {
    container.innerHTML = '<li class="list-group-item">No players data available</li>';
    return;
  }

  players.forEach(player => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `
      <div>
        <strong>${player.name}</strong>
        <div class="text-muted small">${player.role} • ${player.battingStyle}${player.bowlingStyle ? ' • ' + player.bowlingStyle : ''}</div>
      </div>
    `;
    container.appendChild(li);
  });
}

function showError(elementId) {
  document.getElementById(elementId).innerHTML =
    '<li class="list-group-item text-danger">Error loading players</li>';
}

document.getElementById('playerSearch')?.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const rows = document.querySelectorAll('#players-table tr');

  rows.forEach(row => {
    const playerName = row.querySelector('td').textContent.toLowerCase();
    row.style.display = playerName.includes(searchTerm) ? 'table-row' : 'none';
  });
});

function createMatchCard(match) {
  const matchInfo = match.matchInfo;
  const team1 = matchInfo.team1;
  const team2 = matchInfo.team2;
  const venue = matchInfo.venueInfo;

  const team1Score = match.matchScore ? formatScore(match.matchScore.team1Score) : 'Yet to bat';
  const team2Score = match.matchScore ? formatScore(match.matchScore.team2Score) : 'Yet to bat';

  const playersUrl = `match-details.html?matchId=${matchInfo.matchId}&team1=${encodeURIComponent(team1.teamName)}&team2=${encodeURIComponent(team2.teamName)}&team1Id=${team1.teamId}&team2Id=${team2.teamId}`;

  return `
    <div class="col-md-6 col-lg-4">
      <div class="card match-card mb-4">
        <div class="card-body">
          <h5 class="card-title">${team1.teamName} vs ${team2.teamName}</h5>
          <h6 class="card-subtitle mb-2 text-muted">${matchInfo.matchDesc} - ${matchInfo.matchFormat}</h6>
          <div class="match-details mt-3">
            <p class="mb-1"><strong>Venue:</strong> ${venue ? `${venue.ground}, ${venue.city}` : 'TBD'}</p>
            <p class="mb-1"><strong>Status:</strong> ${matchInfo.status}</p>
          </div>
          <div class="scores mt-3">
            <div class="team-score mb-2"><strong>${team1.teamName}:</strong> ${team1Score}</div>
            <div class="team-score"><strong>${team2.teamName}:</strong> ${team2Score}</div>
          </div>
          <a href="${playersUrl}" class="btn btn-primary btn-sm mt-3">View Players</a>
        </div>
      </div>
    </div>
  `;
}

function formatScore(teamScore) {
  if (!teamScore) return 'Yet to bat';
  let scoreString = '';
  for (const inning in teamScore) {
    const score = teamScore[inning];
    if (score?.runs) {
      scoreString += `${score.runs}/${score.wickets || 0} (${score.overs || '0'})<br>`;
    }
  }
  return scoreString || 'Yet to bat';
}
