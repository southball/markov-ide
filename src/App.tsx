import * as React from 'react';
import { useState, useEffect, useRef, useReducer } from 'react';
import { MarkovRule, Markov } from './Markov';
import AceEditor from 'react-ace';
import { Alert, Button, ButtonGroup, Col, Form, FormControl, Container, Row } from 'react-bootstrap';

import 'ace-builds/src-noconflict/mode-text';
import 'ace-builds/src-noconflict/theme-github';

function LogDisplay({ log }: { log: string[] }) {
  const ref = useRef<any>();

  useEffect(() => {
    console.log(ref.current, ref.current.scrollTop);
    if (typeof ref.current.scrollTop !== 'undefined')
      ref.current.scrollTop = 1e9;
  }, [log])

  return (
    <div ref={ref} style={{ height: "500px", overflowY: "auto", fontFamily: "Consolas", border: "1px solid #000" }}>
      <div style={{ margin: "1rem" }}>
        {log.map((logLine, index) => (
          <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{index}: {logLine}</div>
        ))}
      </div>
    </div>
  )
}

interface State {
  markov: Markov;
  log: string[];
  runInterval?: any;
  error: string;
  running: boolean;
}

const reducer = (state: State, action: { type: string, [key: string]: any }) => {
  const { markov, runInterval, error, log } = state;
  const notRunning = {
    runInterval: undefined,
    running: false,
  };

  switch (action.type) {
    case 'step':
      if (markov.terminated) {
        clearInterval(runInterval);
        return { ...state, ...notRunning, runInterval: undefined };
      }

      const [moved, newMarkov] = markov.step();

      if (moved && !markov.terminated && log.includes(newMarkov.state)) {
        clearInterval(runInterval);
        return {
          ...state,
          ...notRunning,
          markov: newMarkov,
          log: [...log, newMarkov.state],
          error: `Repeating state ${newMarkov.state} on step ${log.length}, previous occurred on step ${log.indexOf(newMarkov.state)}`,
        };
      }

      if (moved)
        return { ...state, markov: newMarkov, log: [...log, newMarkov.state] };
      else {
        clearInterval(runInterval);
        return { ...state, ...notRunning, markov: newMarkov, log: [...log] };
      }
    case 'pause':
      clearInterval(runInterval);
      return { ...state, running: false };
    case 'reset':
      clearInterval(runInterval);
      return { ...state, ...notRunning, markov: markov.reset(), log: [markov.initialState], error: '' };
    case 'setRules':
      clearInterval(runInterval);
      try {
        const newMarkov = markov.parseRules(action.rules);
        return { ...state, ...notRunning, markov: newMarkov, error: '' };
      } catch (err) {
        return { ...state, ...notRunning, markov, error: err.message };
      }
    case 'setInitialState':
      clearInterval(runInterval);
      return { ...state, ...notRunning, markov: markov.setInitialState(action.initialState), log: [action.initialState], error: '' };
    case 'setInterval':
      return { ...state, markov, log, runInterval: action.interval, running: true };
    default:
      return state;
  }
};

function App() {
  const [editorContent, setEditorContent] = useState('');
  const [speed, setSpeed] = useState<number>(5);

  const [{ markov, error, log, running, runInterval }, dispatch] = useReducer(
    reducer,
    {
      markov: new Markov(),
      log: [],
      runInterval: undefined,
      error: '',
      running: false,
    } as State);

  useEffect(() => {
    dispatch({ type: 'setRules', rules: editorContent.split('\n') });
  }, [editorContent]);

  useEffect(() => {
    dispatch({ type: 'reset' });
  }, [markov.initialState]);

  const runOrPause = () => {
    // Already running
    if (runInterval && running) {
      dispatch({ type: 'pause' });
      return;
    }

    const interval = setInterval(() => {
      dispatch({ type: 'step' });
    }, 500 / speed);

    dispatch({ type: 'setInterval', interval });
  };

  return (
    <div className="App">
      <Container fluid style={{ padding: "2rem" }}>
        <h1>Markov IDE</h1>
        <h5>Challenge yourself at <a href="https://mao.snuke.org">Markov Algorithm Online</a> by <a href="https://twitter.com/snuke_/">@snuke_</a>!</h5>
        <hr />

        <Row style={{ marginBottom: "1rem" }}>
          <Col>
            <FormControl placeholder="State" value={markov.state} onChange={(event) => dispatch({ type: 'setInitialState', initialState: event.target.value })} />
          </Col>
        </Row>

        <Row style={{ marginBottom: "1rem" }}>
          <Col>
            <h3>Control</h3>
            <ButtonGroup>
              <Button disabled={markov.terminated} onClick={() => runOrPause()}>
                {!running ? "Run" : "Pause"}
              </Button>
              <Button disabled={running || markov.terminated} onClick={() => dispatch({ type: 'step' })}>Step</Button>
              <Button onClick={() => dispatch({ type: 'reset' })}>Reset</Button>
              <Button variant="outline-secondary">Terminated: {markov.terminated ? "Yes" : "No"}</Button>
            </ButtonGroup>
          </Col>

          <Col>
            <h3>Speed (500 ms/step ~ 20 ms/step)</h3>
            Current speed: {(500 / speed).toFixed()} ms/step
            <Form.Control disabled={running} type="range" min={1} max={25} value={speed} onChange={(event) => setSpeed(+event.target.value)} />
          </Col>
        </Row>

        <Row style={{ marginBottom: "1rem" }}>
          <Col>
            <h3>Algorithm</h3>
            <div style={{ border: '1px solid #000;' }}>
              <AceEditor
                fontSize={14}
                width="auto"
                height="500px"
                mode="text"
                theme="github"
                value={editorContent}
                onChange={(newContent) => setEditorContent(newContent)}
              />
            </div>
          </Col>

          <Col>
            <h3>Log</h3>
            {error && <Alert variant="danger" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{error}</Alert>}
            <LogDisplay log={log} />
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default App;
