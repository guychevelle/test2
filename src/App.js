import { useState, useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { Auth } from 'aws-amplify';
import { Lambda } from 'aws-sdk/clients/lambda';
import './App.css';

import { API } from 'aws-amplify';
import { Storage } from 'aws-amplify';

import awsconfig from './aws-exports';

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

  function callLambda () {
    const apiname = "todoApi";
    const path = "/items";
    const myinit = {
      headers: {},  // optional
      response: true,  // optional
      querystringparameters: {
        name: 'param'  // optional
      }
    };

    API.get(apiname, path, myinit)
       .then((response) => {
     console.log('api.get response', response);
     })
       .catch((error) => {
     console.log('api.get error', error);
     });
  }


  if (!publiccode)
    getCode('public', 'index.js', updatePublicCode);
  else
    console.log('publiccode', publiccode);

/*
  Auth.currentCredentials()
    .then(credentials => {
      const lambda = new Lambda({
        credentials: Auth.essentialCredentials(credentials)
      });
      console.log('inside auth.currentcredentials');
      return lambda.invoke({
        FunctionName: 'test2function-test',
        Payload: JSON.stringify({ hello: 'world' }),
      });
    });
*/

/*
  if (!privatecode)
    getCode('protected', 'App.js', updatePrivateCode);
  else
    console.log('privatecode', privatecode);
*/

/*
invoke url from api gateway configuration:
https://k2dao4cir9.execute-api.us-east-1.amazonaws.com/test
*/
  async function callApi() {
    const user = await Auth.currentAuthenticatedUser()
    const token = user.signInUserSession.idToken.jwtToken
    console.log("token: ", token)

    console.log('user', user);

    const requestData = {
        headers: {
            Authorization: token
        }
    }
    const data = await API.get('todoApi', '/items', requestData)
    console.log("data: ", data)
  }

//  Auth.configure(awsconfig);


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
      <div>
        <button onClick={callApi}>Call Lambda</button>
      </div>
      public file<p />
      {publiccode}
      <p />
      private file<p />
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
