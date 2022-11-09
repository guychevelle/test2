import { useState, useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { Auth } from 'aws-amplify';
import './App.css';

import { API } from 'aws-amplify';
import { Storage } from 'aws-amplify';

function App() {

  const [publiccode, updatePublicCode] = useState(null);
  const [privatecode, updatePrivateCode] = useState(null);

  function logOut () {
    Auth.signOut();
  }

  async function getCode(level, key, updatefunc) {
    const result = await Storage.get(key,
                                      {level: level,
                                       contentType: 'string',
                                       download: true
                                      });
    result.Body.text().then(data => {
      console.log('file content', data);
      updatefunc(data);
    });
  }

  if (!publiccode)
    getCode('public', 'index.js', updatePublicCode);
  else
    console.log('publiccode', publiccode);

  if (!privatecode)
    getCode('protected', 'App.js', updatePrivateCode);
  else
    console.log('privatecode', privatecode);

  return (
    <div className="App">
      <h2>Test App</h2>
      <div>
        <Authenticator>
          {({ user }) => (
            <main>
              Hello {user.username}
            </main>
          )}
        </Authenticator>
      </div>
      <div>
        <button onClick={logOut}>Log Out</button>
      </div>
      public file<p />
      {publiccode}
      <p />
      private file<p />
      {privatecode}
    </div>
  );
}

export default App;
/*
      <Authenticator>
        {({ user }) => (
          <main>
            Hello {user.username}
          </main>
        )}
      </Authenticator>
*/
