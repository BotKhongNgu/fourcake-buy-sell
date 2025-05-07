import { Fragment } from 'react/jsx-runtime';
import BotControl from './components/BotControl';
import { useEffect } from 'react';
import { db } from './services/db';

function App(): JSX.Element {
  return (
    <Fragment>
      <BotControl />
    </Fragment>
  );
}

export default App;
