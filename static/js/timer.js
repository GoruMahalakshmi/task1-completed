class Timer {
    constructor(options = {}) {
        this.startTime = null;
        this.elapsedTime = 0;
        this.isRunning = false;
        this.interval = null;
        this.taskId = null;
        this.displayElement = options.displayElement;
        this.onTick = options.onTick || this.defaultOnTick.bind(this);
        this.onStart = options.onStart || function() {};
        this.onStop = options.onStop || function() {};
        this.onPause = options.onPause || function() {};
        if (this.isRunning) {
            this.resumeTimer();
        }
    }
    
    start(taskId = null) {
        if (this.isRunning) {
            return false;
        }
        
        this.taskId = taskId;
        this.startTime = Date.now() - this.elapsedTime;
        this.isRunning = true;
        
        this.interval = setInterval(() => {
            this.elapsedTime = Date.now() - this.startTime;
            this.onTick(this.elapsedTime);
            this.saveState();
        }, 1000);
        
        this.onStart(this.taskId);
        this.saveState();
        
        return true;
    }
    
    stop() {
        if (!this.isRunning) {
            return false;
        }
        
        this.isRunning = false;
        clearInterval(this.interval);
        this.interval = null;
        
        const totalTime = this.elapsedTime;
        this.onStop(this.taskId, totalTime);
        this.reset();
        return true;
    }
    pause() {
        if (!this.isRunning) {
            return false;
        }
        
        this.isRunning = false;
        clearInterval(this.interval);
        this.interval = null;
        
        this.onPause(this.taskId, this.elapsedTime);
        this.saveState();
        
        return true;
    }
    resume() {
        if (this.isRunning) {
            return false;
        }
        
        return this.start(this.taskId);
    }
    reset() {
        this.isRunning = false;
        this.elapsedTime = 0;
        this.startTime = null;
        this.taskId = null;
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        this.onTick(0);
        this.clearState();
    }
    resumeTimer() {
        if (this.startTime && this.isRunning) {
            this.interval = setInterval(() => {
                this.elapsedTime = Date.now() - this.startTime;
                this.onTick(this.elapsedTime);
                this.saveState();
            }, 1000);
        }
    }
    defaultOnTick(elapsedTime) {
        if (this.displayElement) {
            this.displayElement.textContent = this.formatTime(elapsedTime);
        }
    }
      formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
      getElapsedSeconds() {
        return Math.floor(this.elapsedTime / 1000);
    }
       saveState() {
        const state = {
            startTime: this.startTime,
            elapsedTime: this.elapsedTime,
            isRunning: this.isRunning,
            taskId: this.taskId,
            timestamp: Date.now()
        };
        
        ProductivityTracker.LocalStorage.set('timerState', state);
    }
     loadState() {
        const state = ProductivityTracker.LocalStorage.get('timerState');
        
        if (state && state.isRunning) {
            const timeSinceLastUpdate = Date.now() - state.timestamp;
            if (timeSinceLastUpdate < 24 * 60 * 60 * 1000) { // 24 hours
                this.startTime = state.startTime;
                this.elapsedTime = state.elapsedTime;
                this.isRunning = state.isRunning;
                this.taskId = state.taskId;
                if (this.isRunning && this.startTime) {
                    this.elapsedTime = Date.now() - this.startTime;
                }
            }
        }
    }
    
    clearState() {
        ProductivityTracker.LocalStorage.remove('timerState');
    }
}

/**
 * Timer UI Controller
 */
class TimerUI {
    constructor() {
        this.timer = null;
        this.currentTaskElement = null;
        this.timerDisplayElement = null;
        this.startButton = null;
        this.stopButton = null;
        this.pauseButton = null;
        this.taskSelect = null;
        this.init();
    }
    
    init() {
        this.timerDisplayElement = document.getElementById('timer-display');
        this.currentTaskElement = document.getElementById('current-task');
        this.startButton = document.getElementById('start-timer-btn');
        this.stopButton = document.getElementById('stop-timer-btn');
        this.pauseButton = document.getElementById('pause-timer-btn');
        this.taskSelect = document.getElementById('task-select');
        this.timer = new Timer({
            displayElement: this.timerDisplayElement,
            onStart: this.onTimerStart.bind(this),
            onStop: this.onTimerStop.bind(this),
            onPause: this.onTimerPause.bind(this)
        });
        this.bindEvents();
        this.updateUI();
    }
    
    bindEvents() {
        if (this.startButton) {
            this.startButton.addEventListener('click', this.handleStart.bind(this));
        }
        
        if (this.stopButton) {
            this.stopButton.addEventListener('click', this.handleStop.bind(this));
        }
        
        if (this.pauseButton) {
            this.pauseButton.addEventListener('click', this.handlePause.bind(this));
        }
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.timer.isRunning) {
                this.timer.elapsedTime = Date.now() - this.timer.startTime;
                this.timer.onTick(this.timer.elapsedTime);
            }
        });
    }
    
    handleStart() {
        const taskId = this.taskSelect ? this.taskSelect.value : null;
        
        if (!taskId) {
            showToast('Please select a task to start timing', 'warning');
            return;
        }
        const form = document.getElementById('timer-form');
        if (form) {
            const formData = new FormData(form);
            formData.set('task_id', taskId);
            formData.set('action', 'start');
            
            fetch(form.action, {
                method: 'POST',
                body: formData
            }).then(response => {
                if (response.ok) {
                    this.timer.start(taskId);
                    this.updateUI();
                } else {
                    showToast('Failed to start timer', 'danger');
                }
            }).catch(error => {
                console.error('Error starting timer:', error);
                showToast('Failed to start timer', 'danger');
            });
        } else {
            this.timer.start(taskId);
            this.updateUI();
        }
    }
    
    handleStop() {
        const form = document.getElementById('timer-form');
        if (form) {
            const formData = new FormData(form);
            formData.set('action', 'stop');
            
            fetch(form.action, {
                method: 'POST',
                body: formData
            }).then(response => {
                if (response.ok) {
                    this.timer.stop();
                    this.updateUI();
                    showToast('Timer stopped and time logged', 'success');
                } else {
                    showToast('Failed to stop timer', 'danger');
                }
            }).catch(error => {
                console.error('Error stopping timer:', error);
                showToast('Failed to stop timer', 'danger');
            });
        } else {
            this.timer.stop();
            this.updateUI();
        }
    }
    
    handlePause() {
        this.timer.pause();
        this.updateUI();
        showToast('Timer paused', 'info');
    }
    
    onTimerStart(taskId) {
        this.updateCurrentTask(taskId);
        showToast('Timer started', 'success');
    }
    
    onTimerStop(taskId, totalTime) {
        if (this.currentTaskElement) {
            this.currentTaskElement.textContent = 'No active task';
        }
        
        const formattedTime = this.timer.formatTime(totalTime);
        showToast(`Timer stopped. Total time: ${formattedTime}`, 'success');
    }
    
    onTimerPause(taskId, elapsedTime) {
        const formattedTime = this.timer.formatTime(elapsedTime);
        showToast(`Timer paused at ${formattedTime}`, 'info');
    }
    
    updateCurrentTask(taskId) {
        if (this.currentTaskElement && this.taskSelect) {
            const selectedOption = this.taskSelect.querySelector(`option[value="${taskId}"]`);
            if (selectedOption) {
                this.currentTaskElement.textContent = selectedOption.textContent;
            }
        }
    }
    
    updateUI() {
        const isRunning = this.timer.isRunning;
        if (this.startButton) {
            this.startButton.disabled = isRunning;
            this.startButton.style.display = isRunning ? 'none' : 'inline-block';
        }
        
        if (this.stopButton) {
            this.stopButton.disabled = !isRunning;
            this.stopButton.style.display = isRunning ? 'inline-block' : 'none';
        }
        
        if (this.pauseButton) {
            this.pauseButton.disabled = !isRunning;
            this.pauseButton.style.display = isRunning ? 'inline-block' : 'none';
        }
        
        if (this.taskSelect) {
            this.taskSelect.disabled = isRunning;
        }
        if (isRunning && this.timer.taskId) {
            this.updateCurrentTask(this.timer.taskId);
        }
    }
}
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('timer-display')) {
        window.timerUI = new TimerUI();
    }
    initializeActiveTimers();
});

function initializeActiveTimers() {
    const activeTimerElements = document.querySelectorAll('[id^="active-timer-"]');
    
    activeTimerElements.forEach(element => {
        const entryId = element.id.replace('active-timer-', '');
        const startTimeAttr = element.getAttribute('data-start-time');
        
        if (startTimeAttr) {
            updateActiveTimerDisplay(element, startTimeAttr);
        }
    });
}
function updateActiveTimerDisplay(element, startTimeISO) {
    const startTime = new Date(startTimeISO);
    
    function updateDisplay() {
        const now = new Date();
        const elapsed = Math.floor((now - startTime) / 1000);
        
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        
        element.textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateDisplay();
    setInterval(updateDisplay, 1000);
}
window.Timer = Timer;
window.TimerUI = TimerUI;
