import { useState, useEffect } from 'react';
import '../index.css';

const StepperInput = ({ id, label, value, onChange, min, step = 1 }) => {
    const handleDecrement = () => {
        const val = parseInt(value) || 0;
        if (val - step >= min) {
            onChange((val - step).toString());
        } else {
            onChange(min.toString());
        }
    };

    const handleIncrement = () => {
        const val = parseInt(value) || 0;
        onChange((val + step).toString());
    };

    return (
        <div className="input-group">
            <label htmlFor={id}>{label}</label>
            <div className="stepper-row">
                <button type="button" className="stepper-btn" onClick={handleDecrement}>−</button>
                <input
                    id={id}
                    type="number"
                    min={min}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required
                />
                <button type="button" className="stepper-btn" onClick={handleIncrement}>+</button>
            </div>
        </div>
    );
};

export default function TimerConfig({ onStart }) {
    const [sets, setSets] = useState(() => localStorage.getItem('timer_sets') || '3');
    const [duration, setDuration] = useState(() => localStorage.getItem('timer_duration') || '20');
    const [rest, setRest] = useState(() => localStorage.getItem('timer_rest') || '40');
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('timer_voice') || '');

    useEffect(() => {
        localStorage.setItem('timer_sets', sets);
        localStorage.setItem('timer_duration', duration);
        localStorage.setItem('timer_rest', rest);
        if (selectedVoice) {
            localStorage.setItem('timer_voice', selectedVoice);
        }
    }, [sets, duration, rest, selectedVoice]);

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            if (availableVoices.length > 0) {
                // Collect english voices
                let englishVoices = availableVoices.filter(v => v.lang.startsWith('en'));
                if (englishVoices.length === 0) englishVoices = availableVoices; // fallback if no english

                setVoices(englishVoices);

                // Pre-select a good default if nothing is selected or if saved voice is invalid
                const isValidVoice = availableVoices.some(v => v.name === selectedVoice);
                if (!selectedVoice || !isValidVoice) {
                    const defaultVoice = englishVoices.find(
                        v => v.name.includes('Natural') || v.name.includes('Zira') || v.name.includes('Female')
                    );
                    setSelectedVoice(defaultVoice ? defaultVoice.name : englishVoices[0].name);
                }
            }
        };

        loadVoices();
        // Some browsers load voices asynchronously, so we listen for the event
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, [selectedVoice]);

    const handleStart = (e) => {
        e.preventDefault();
        onStart({
            sets: parseInt(sets) || 1,
            duration: parseInt(duration) || 10,
            rest: parseInt(rest) || 10,
            voiceName: selectedVoice,
        });
    };

    const handleVoiceChange = (e) => {
        const selected = e.target.value;
        setSelectedVoice(selected);

        // Play a preview of the selected voice
        const voiceToUse = voices.find(v => v.name === selected);
        if (voiceToUse && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance("ready to work out");
            utterance.voice = voiceToUse;
            utterance.rate = 1.0;
            utterance.pitch = 1.1;
            window.speechSynthesis.speak(utterance);
        }
    };

    return (
        <div className="card">
            <h1>Gym Timer</h1>

            <form onSubmit={handleStart}>
                <StepperInput
                    id="sets"
                    label="Number of Sets"
                    value={sets}
                    onChange={setSets}
                    min={1}
                />

                <StepperInput
                    id="duration"
                    label="Work Duration (sec)"
                    value={duration}
                    onChange={setDuration}
                    min={1}
                    step={5}
                />

                <StepperInput
                    id="rest"
                    label="Rest Period (sec)"
                    value={rest}
                    onChange={setRest}
                    min={0}
                    step={5}
                />

                {voices.length > 0 && (
                    <div className="input-group">
                        <label htmlFor="voice">Voice</label>
                        <select
                            id="voice"
                            value={selectedVoice}
                            onChange={handleVoiceChange}
                        >
                            {voices.map(v => (
                                <option key={v.name} value={v.name}>
                                    {v.name} ({v.lang})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <button type="submit" className="btn">
                    Start Workout
                </button>
            </form>
        </div>
    );
}
