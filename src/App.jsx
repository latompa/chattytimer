import { useState } from 'react';
import TimerConfig from './components/TimerConfig';
import ActiveTimer from './components/ActiveTimer';
import './index.css';

function App() {
  const [config, setConfig] = useState(null);

  return (
    <>
      {config ? (
        <ActiveTimer
          config={config}
          onCancel={() => setConfig(null)}
        />
      ) : (
        <TimerConfig onStart={setConfig} />
      )}
    </>
  );
}

export default App;
