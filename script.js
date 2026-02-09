// Zone data with start times, shrink times, and total times
const zones = [
    { id: 1, start: 300, shrink: 300, total: 720 },  // 5:00 - 5:00 = 10:00, total: 12:00
    { id: 2, start: 200, shrink: 140, total: 1060 }, // 3:20 - 2:20 = 5:40, total: 17:40
    { id: 3, start: 150, shrink: 90, total: 1300 },  // 2:30 - 1:30 = 4:00, total: 21:40
    { id: 4, start: 120, shrink: 60, total: 1480 },   // 2:00 - 1:00 = 3:00, total: 24:40
    { id: 5, start: 120, shrink: 40, total: 1640 },   // 2:00 - 0:40 = 2:40, total: 27:20
    { id: 6, start: 90, shrink: 30, total: 1760 },    // 1:30 - 0:30 = 2:00, total: 29:20
    { id: 7, start: 90, shrink: 30, total: 1880 },    // 1:30 - 0:30 = 2:00, total: 31:20
    { id: 8, start: 60, shrink: 30, total: 1970 }     // 1:00 - 0:30 = 1:30, total: 32:50
];

const FLIGHT_TIME = 120; // 2:00 in seconds

let isRunning = false;
let startTime = null;
let flightTimer = null;
let currentZoneIndex = -1; // -1 means flight phase
let zoneTimer = null;
let currentPhase = 'start'; // 'start' or 'shrink'
let phaseStartTime = null;
let phaseElapsedTime = 0;
let speedMultiplier = 1; // Default speed multiplier
let zoneSpeeds = {}; // Store speed for each zone
const SPEED_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]; // Available speed levels

// Format seconds to MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update flight timer display
function updateFlightTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, FLIGHT_TIME - elapsed);
    document.getElementById('flightTime').textContent = formatTime(remaining);

    if (remaining <= 0) {
        clearInterval(flightTimer);
        startZone(0);
    }
}

// Start a specific zone
function startZone(zoneIndex) {
    if (zoneIndex >= zones.length) {
        // All zones completed
        return;
    }

    // Deactivate previous zone
    if (currentZoneIndex >= 0) {
        document.getElementById(`zone${zones[currentZoneIndex].id}`).classList.remove('active');
        document.getElementById(`zone${zones[currentZoneIndex].id}`).classList.add('completed');
    }

    currentZoneIndex = zoneIndex;
    const zone = zones[zoneIndex];

    // Activate current zone
    document.getElementById(`zone${zone.id}`).classList.add('active');

    // Keep current speed or use zone speed if set
    if (zoneSpeeds[zone.id] !== undefined) {
        speedMultiplier = zoneSpeeds[zone.id];
    } else {
        // Keep current speed for new zone
        zoneSpeeds[zone.id] = speedMultiplier;
    }
    
    // Update reset button text and state
    const speedControl = document.querySelector(`.speed-control[data-zone="${zone.id}"]`);
    if (speedControl) {
        const resetBtn = speedControl.querySelector('.speed-reset');
        if (speedMultiplier === 1) {
            resetBtn.textContent = '1x';
            resetBtn.classList.add('active');
        } else {
            resetBtn.textContent = speedMultiplier + 'x';
            resetBtn.classList.remove('active');
        }
    }

    // Start start phase
    currentPhase = 'start';
    phaseStartTime = Date.now();
    phaseElapsedTime = 0;

    // Start zone timer
    if (zoneTimer) clearInterval(zoneTimer);
    zoneTimer = setInterval(updateZoneTimer, 100);
}

// Update zone timer
function updateZoneTimer() {
    const zone = zones[currentZoneIndex];
    const realElapsed = (Date.now() - phaseStartTime) / 1000;
    const elapsed = Math.floor(realElapsed * speedMultiplier);
    phaseElapsedTime = elapsed;

    if (currentPhase === 'start') {
        // Update start time countdown
        const startRemaining = Math.max(0, zone.start - elapsed);
        const startEl = document.getElementById(`zone${zone.id}-start`);
        if (startEl) {
            startEl.textContent = formatTime(startRemaining);
        }

        // Keep shrink time at its initial value
        const shrinkEl = document.getElementById(`zone${zone.id}-shrink`);
        if (shrinkEl) {
            shrinkEl.textContent = formatTime(zone.shrink);
        }

        // Update overall countdown (total remaining time)
        const countdownEl = document.getElementById(`zone${zone.id}-countdown`);
        if (countdownEl) {
            const totalRemaining = startRemaining + zone.shrink;
            countdownEl.textContent = formatTime(totalRemaining);
        }

        // Check if start phase is complete
        if (elapsed >= zone.start) {
            currentPhase = 'shrink';
            phaseStartTime = Date.now();
            phaseElapsedTime = 0;
        }
    } else if (currentPhase === 'shrink') {
        // Keep start time at 0
        const startEl = document.getElementById(`zone${zone.id}-start`);
        if (startEl) {
            startEl.textContent = formatTime(0);
        }

        // Update shrink time countdown
        const shrinkRemaining = Math.max(0, zone.shrink - elapsed);
        const shrinkEl = document.getElementById(`zone${zone.id}-shrink`);
        if (shrinkEl) {
            shrinkEl.textContent = formatTime(shrinkRemaining);
        }

        // Update overall countdown (total remaining time)
        const countdownEl = document.getElementById(`zone${zone.id}-countdown`);
        if (countdownEl) {
            countdownEl.textContent = formatTime(shrinkRemaining);
        }

        // Check if shrink phase is complete
        if (elapsed >= zone.shrink) {
            // Move to next zone without clearing the timer
            startZone(currentZoneIndex + 1);
        }
    }
}

// Skip to next phase
function skipPhase() {
    if (!isRunning) {
        // Allow skipping even if not running
        isRunning = true;
        startTime = Date.now();
        currentZoneIndex = -1;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('startBtn').style.opacity = '0.5';
    }

    if (currentZoneIndex === -1) {
        // Skip flight phase
        if (flightTimer) clearInterval(flightTimer);
        document.getElementById('flightTime').textContent = formatTime(0);
        startZone(0);
    } else if (currentZoneIndex < zones.length) {
        if (currentPhase === 'start') {
            // Skip to shrink phase
            const zone = zones[currentZoneIndex];
            const startEl = document.getElementById(`zone${zone.id}-start`);
            if (startEl) {
                startEl.textContent = formatTime(0);
            }
            currentPhase = 'shrink';
            phaseStartTime = Date.now();
            phaseElapsedTime = 0;
        } else if (currentPhase === 'shrink') {
            // Skip to next zone
            if (zoneTimer) clearInterval(zoneTimer);
            const zone = zones[currentZoneIndex];
            const shrinkEl = document.getElementById(`zone${zone.id}-shrink`);
            if (shrinkEl) {
                shrinkEl.textContent = formatTime(0);
            }
            startZone(currentZoneIndex + 1);
        }
    }

    // Force UI update
    setTimeout(() => {
        document.body.style.display = 'none';
        document.body.offsetHeight; // Trigger reflow
        document.body.style.display = 'block';
    }, 0);
}

// Start all timers
function startTimers() {
    if (isRunning) return;

    isRunning = true;
    startTime = Date.now();
    currentZoneIndex = -1;

    // Start flight timer
    flightTimer = setInterval(updateFlightTimer, 1000);

    // Disable start button
    document.getElementById('startBtn').disabled = true;
    document.getElementById('startBtn').style.opacity = '0.5';
}

// Reset all timers
function resetTimers() {
    isRunning = false;
    startTime = null;
    currentZoneIndex = -1;
    currentPhase = 'start';
    phaseStartTime = null;
    phaseElapsedTime = 0;

    // Clear all timers
    clearInterval(flightTimer);
    if (zoneTimer) clearInterval(zoneTimer);
    zoneTimer = null;

    // Reset flight timer display
    document.getElementById('flightTime').textContent = formatTime(FLIGHT_TIME);

    // Reset all zone countdowns and classes
    zones.forEach(zone => {
        const startEl = document.getElementById(`zone${zone.id}-start`);
        const shrinkEl = document.getElementById(`zone${zone.id}-shrink`);
        const countdownEl = document.getElementById(`zone${zone.id}-countdown`);
        
        if (startEl) startEl.textContent = formatTime(zone.start);
        if (shrinkEl) shrinkEl.textContent = formatTime(zone.shrink);
        if (countdownEl) countdownEl.textContent = '--:--';
        
        document.getElementById(`zone${zone.id}`).classList.remove('active', 'completed');
    });

    // Enable start button
    document.getElementById('startBtn').disabled = false;
    document.getElementById('startBtn').style.opacity = '1';
}

// Event listeners
document.getElementById('startBtn').addEventListener('click', startTimers);
document.getElementById('resetBtn').addEventListener('click', resetTimers);

// Add event listeners to all zone skip buttons
document.querySelectorAll('.zone-skip-btn').forEach(btn => {
    btn.addEventListener('click', skipPhase);
});

// Add event listeners to all speed buttons
document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const speedControl = this.closest('.speed-control');
        const zoneId = parseInt(speedControl.dataset.zone);
        const action = this.dataset.action;
        
        // Get current speed for this zone
        let currentSpeed = zoneSpeeds[zoneId] || 1;
        
        if (action === 'up') {
            // Increase speed to next level
            const currentIndex = SPEED_LEVELS.indexOf(currentSpeed);
            if (currentIndex < SPEED_LEVELS.length - 1) {
                currentSpeed = SPEED_LEVELS[currentIndex + 1];
            }
        } else if (action === 'down') {
            // Decrease speed to previous level
            const currentIndex = SPEED_LEVELS.indexOf(currentSpeed);
            if (currentIndex > 0) {
                currentSpeed = SPEED_LEVELS[currentIndex - 1];
            }
        } else if (action === 'reset') {
            // Reset to normal speed
            currentSpeed = 1;
        }
        
        // Store speed for this zone
        zoneSpeeds[zoneId] = currentSpeed;
        
        // Update speed for current zone
        if (currentZoneIndex >= 0 && zones[currentZoneIndex].id === zoneId) {
            speedMultiplier = currentSpeed;
            // Adjust phaseStartTime to maintain the current elapsed time
            phaseStartTime = Date.now() - (phaseElapsedTime / currentSpeed * 1000);
        }
        
        // Update reset button text and state
        const resetBtn = speedControl.querySelector('.speed-reset');
        if (currentSpeed === 1) {
            resetBtn.textContent = '1x';
            resetBtn.classList.add('active');
        } else {
            resetBtn.textContent = currentSpeed + 'x';
            resetBtn.classList.remove('active');
        }
    });
});

// Initialize display
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('flightTime').textContent = formatTime(FLIGHT_TIME);
    
    // Initialize zone displays
    zones.forEach(zone => {
        const startEl = document.getElementById(`zone${zone.id}-start`);
        const shrinkEl = document.getElementById(`zone${zone.id}-shrink`);
        
        if (startEl) startEl.textContent = formatTime(zone.start);
        if (shrinkEl) shrinkEl.textContent = formatTime(zone.shrink);
    });
});
