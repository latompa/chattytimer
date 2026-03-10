import { useState, useEffect, useRef } from 'react';
import '../index.css';

export default function ActiveTimer({ config, onCancel }) {
    const [currentSet, setCurrentSet] = useState(1);
    const [phase, setPhase] = useState('PREPARE'); // PREPARE, WORK, REST, DONE
    const [timeLeft, setTimeLeft] = useState(5); // 5s PREPARE
    const [isActive, setIsActive] = useState(true);

    const timeLeftRef = useRef(timeLeft);
    const phaseRef = useRef(phase);
    const currentSetRef = useRef(currentSet);
    const isActiveRef = useRef(isActive);
    const wakeLockRef = useRef(null);

    // Request wake lock to prevent screen from sleeping
    useEffect(() => {
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                }
            } catch (err) {
                console.error(`Wake Lock error: ${err.name}, ${err.message}`);
            }
        };

        requestWakeLock();

        const handleVisibilityChange = async () => {
            // Re-request if document becomes visible again
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(console.error);
                wakeLockRef.current = null;
            }
        };
    }, []);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { currentSetRef.current = currentSet; }, [currentSet]);
    useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

    const speak = (text) => {
        // Stop any currently playing speech to avoid overlap
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        // Attempt to find the specific voice the user selected
        const voices = window.speechSynthesis.getVoices();

        const selectedVoice = voices.find(v => v.name === config.voiceName);

        if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
        } else {
            // Fallback to the first available English voice if the config is missing or invalid
            const englishVoice = voices.find(v => v.lang.startsWith('en'));
            if (englishVoice) {
                utterance.voice = englishVoice;
                utterance.lang = englishVoice.lang;
            }
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.1; // Slightly higher pitch often sounds less harsh
        window.speechSynthesis.speak(utterance);
    };

    // Pre-load voices to ensure they are available when the timer starts.
    // getVoices() is often populated asynchronously on some browsers
    useEffect(() => {
        window.speechSynthesis.getVoices();
    }, []);

    useEffect(() => {
        if (!isActive) return;

        if (phase === 'PREPARE') {
            if (timeLeft === 5) speak(`Get ready, set ${currentSet}`);
            if (timeLeft <= 3 && timeLeft > 0) speak(timeLeft.toString());
        }

        // Count UP during WORK
        if (phase === 'WORK') {
            const currentCount = config.duration - timeLeft + 1;
            if (currentCount <= config.duration) {
                if (currentCount === 1) {
                    speak('Go');
                } else if (currentCount % 5 === 0) {
                    speak(currentCount.toString());
                }
            }
        }

        if (phase === 'REST') {
            if (timeLeft === config.rest) speak(`Rest for ${config.rest} seconds`);
            if (timeLeft <= 3 && timeLeft > 0) speak(timeLeft.toString());
        }
    }, [timeLeft, phase, isActive, currentSet, config]);

    useEffect(() => {
        let interval;

        if (isActive) {
            interval = setInterval(() => {
                if (timeLeftRef.current > 1) {
                    setTimeLeft((prev) => prev - 1);
                } else {
                    handlePhaseTransition();
                }
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [isActive]);

    const handlePhaseTransition = () => {
        const currentPhase = phaseRef.current;

        if (currentPhase === 'PREPARE') {
            setPhase('WORK');
            setTimeLeft(config.duration);
        } else if (currentPhase === 'WORK') {
            if (currentSetRef.current >= config.sets) {
                setPhase('DONE');
                setTimeLeft(0);
                setIsActive(false);
                speak('Workout complete! Great job!');
            } else {
                setPhase('REST');
                setTimeLeft(config.rest);
            }
        } else if (currentPhase === 'REST') {
            setCurrentSet((prev) => prev + 1);
            setPhase('WORK');
            setTimeLeft(config.duration);
        }
    };

    const togglePause = () => {
        setIsActive(!isActive);
        if (!isActive) {
            speak('Resuming');
        } else {
            speak('Paused');
        }
    };

    const getTotalTimeForPhase = () => {
        if (phase === 'PREPARE') return 5;
        if (phase === 'WORK') return config.duration;
        if (phase === 'REST') return config.rest;
        return 1;
    };

    const getProgressPercentage = () => {
        if (phase === 'DONE') return 100;
        const total = getTotalTimeForPhase();
        return ((total - timeLeft + 1) / total) * 100;
    };

    const handleCancel = () => {
        window.speechSynthesis.cancel();
        onCancel();
    };    

    return (
        <div className="card">
            <div className="timer-display">
                <div className="set-tracker">
                    {Array.from({ length: config.sets }).map((_, i) => {
                        const setNumber = i + 1;
                        let segmentClass = "set-segment";
                        if (setNumber < currentSet || phase === 'DONE') {
                            segmentClass += " completed";
                        } else if (setNumber === currentSet) {
                            segmentClass += " active pulse";
                        }
                        return (
                            <div key={i} className={segmentClass}>
                                {setNumber === currentSet && phase !== 'DONE' && (
                                    <div className="set-number">{setNumber}</div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="phase-text" data-phase={phase}>
                    {phase === 'PREPARE' && 'GET READY'}
                    {phase === 'WORK' && 'WORK'}
                    {phase === 'REST' && 'REST'}
                    {phase === 'DONE' && 'DONE'}
                </div>

                <div className="progress-bar-container" data-phase={phase}>
                    <div 
                        className="progress-bar-fill"
                        style={{ width: `${getProgressPercentage()}%` }}
                    />
                    <div className="time-text">
                        {phase === 'WORK' ? Math.max(0, config.duration - timeLeft + 1) : timeLeft}
                    </div>
                </div>
            </div>

            <div className="controls-grid">
                {phase !== 'DONE' && (
                    <button
                        className="btn"
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                        onClick={togglePause}
                    >
                        {isActive ? 'Pause' : 'Resume'}
                    </button>
                )}
                <button
                    className="btn btn-danger"
                    style={{ gridColumn: phase === 'DONE' ? '1 / span 2' : 'auto' }}
                    onClick={handleCancel}
                >
                    {phase === 'DONE' ? 'Done' : 'Cancel'}
                </button>
            </div>
        </div>
    );
}
