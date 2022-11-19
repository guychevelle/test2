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
      updatefunc(data);
    });
  }

  if (!publiccode)
    getCode('public', 'index.js', updatePublicCode);

/*
invoke url from api gateway configuration:
https://k2dao4cir9.execute-api.us-east-1.amazonaws.com/test
*/
  async function getApi() {
    const user = await Auth.currentAuthenticatedUser()
    const token = user.signInUserSession.idToken.jwtToken
    console.log("token: ", token)

    console.log('user', user);

    const requestData = {
        headers: {
            Authorization: token
        },
        response: true,
        queryStringParameters: {
          name: 'click data',
          description: 'create rest request to lambda'
        }
    }
    const data = await API.get('todoApi', '/items', requestData)
                       .then((response) => {
                         console.log('api.get response', response);
                       })
                       .catch((error) => {
                         console.log('api.get error', error.response);
                       })
  }

  async function createApi(event) {
    //  prevent page from refreshing
    event.preventDefault();
    const user = await Auth.currentAuthenticatedUser()
    const token = user.signInUserSession.idToken.jwtToken
    console.log("token: ", token)

    console.log('user', user);

    const requestData = {
        headers: {
            Authorization: token
        },
        body: {
          name: event.target[0].value,
          description: event.target[1].value
        }
    }
    const data = await API.post('todoApi', '/items', requestData)
                       .then((response) => {
                         console.log('api.post response', response);
                       })
                       .catch((error) => {
                         console.log('api.post error', error.response);
                       })
  }

  async function updateApi(event) {
    //  prevent page from refreshing
    event.preventDefault();
    console.log('update id', event.target[0].value);
    console.log('update version', event.target[1].value);
    const user = await Auth.currentAuthenticatedUser()
    const token = user.signInUserSession.idToken.jwtToken

    const requestData = {
        headers: {
            Authorization: token
        },
        body: {
          id: event.target[0].value,
          version: event.target[1].value,
          name: event.target[2].value,
          description: event.target[3].value
        }
    }

    const data = await API.put('todoApi', '/items', requestData)
                       .then((response) => {
                         console.log('api.put response', response);
                       })
                       .catch((error) => {
                         console.log('api.put error', error.response);
                       })
  }

  async function deleteApi(event) {
    //  prevent page from refreshing
    event.preventDefault();
    console.log('delete id', event.target[0].value);
    console.log('delete version', event.target[1].value);
    const user = await Auth.currentAuthenticatedUser()
    const token = user.signInUserSession.idToken.jwtToken

    const requestData = {
        headers: {
            Authorization: token
        },
        body: {
          id: event.target[0].value,
          version: event.target[1].value
        }
    }

    const data = await API.del('todoApi', '/items', requestData)
                       .then((response) => {
                         console.log('api.del response', response);
                       })
                       .catch((error) => {
                         console.log('api.del error', error.response);
                       })
  }

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
      <p />
      <div>
        <button onClick={getApi}>Query ToDo</button>
      </div>
      <p />
      <div>
        <hr />
        <form onSubmit={createApi}>
          <label>Name:
            <input type="text" name="name" />
          </label>
          <br />
          <label>Description:
            <input type="text" name="description" size="50" />
          </label>
          <br />
          <input type="submit" value="Create ToDo" />
        </form>
        <hr />
      </div>
      <p />
      <div>
        <hr />
        <form onSubmit={updateApi}>
          <label>
            Item Id:
            <input type="text" name="id" size="75" />
          </label>
          <br />
          <label>Item Version:
            <input type="number" name="version" />
          </label>
          <br />
          <label>New Name:
            <input type="text" name="newname" />
          </label>
          <br />
          <label>New Description:
            <input type="text" name="newdesc" size="50" />
          </label>
          <br />
          <input type="submit" value="Update ToDo" />
        </form>
        <hr />
      </div>
      <p />
      <div>
        <hr />
        <form onSubmit={deleteApi}>
          <label>
            Item Id:
            <input type="text" name="id" size="75" />
          </label>
          <br />
          <label>Item Version:
            <input type="number" name="version" />
          </label>
          <br />
          <input type="submit" value="Delete ToDo" />
        </form>
        <hr />
      </div>
      <p />
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
