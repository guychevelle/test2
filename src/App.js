import { useState, useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import { Auth, Hub } from 'aws-amplify';
import { Lambda } from 'aws-sdk/clients/lambda';
import './App.css';

import { API } from 'aws-amplify';
import { Storage } from 'aws-amplify';

//  imports for subscriptions
import { graphqlOperation } from 'aws-amplify';
import * as subscriptions from './graphql/subscriptions';

import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';

import awsconfig from './aws-exports';

function App() {

  const [publiccode, updatePublicCode] = useState(null);
  const [privatecode, updatePrivateCode] = useState(null);
  const [todotable, updateToDoTable] = useState(null);
  const [createmessage, updateCreateMessage] = useState(null);
  const [updatemessage, updateUpdateMessage] = useState(null);
  const [deletemessage, updateDeleteMessage] = useState(null);
  const [user, updateUser] = useState(null);
  const [authactioncount, updateAuthActionCount] = useState(0);

  const authmode = user ? "AMAZON_COGNITO_USER_POOLS" :
                          "AWS_IAM";

  useEffect(() => {
    console.log('running useEffect');
    checkUser();
    setAuthListener();
  }, [authactioncount]);

  async function checkUser() {
    const sess = await Auth.currentSession()
                 .then((response) => {
                   console.log('sess response', response);
                 })
                 .catch((error) => {
                   console.log('sess error', error);
                 });
    const usr = await Auth.currentAuthenticatedUser()
                .then((response) => {
                  updateUser(response);
                })
                .catch((error) => {
                  console.log('current user error', error);
                  updateUser(null);
                });
  }

  // subscription related hooks
  // create subscription
  useEffect(() => {
    const createsub = API.graphql(
      graphqlOperation(subscriptions.onCreateTodo)
      ).subscribe({
        next: ({ provider, value }) => console.log({ provider, value }),
        error: (error) => console.warn(error)
      });

    // to avoid multiple subscription connections and responses when 
    // an item is created, unsubscribe as below
    return () => createsub.unsubscribe();
  }, []);

  // update subscription
  useEffect(() => {
    const updatesub = API.graphql(
      graphqlOperation(subscriptions.onUpdateTodo)
      ).subscribe({
        next: ({ provider, value }) => console.log({ provider, value }),
        error: (error) => console.warn(error)
      });

    // to avoid multiple subscription connections and responses when 
    // an item is created, unsubscribe as below
    return () => updatesub.unsubscribe();
  }, []);

  // delete subscription
  useEffect(() => {
    const deletesub = API.graphql(
      graphqlOperation(subscriptions.onDeleteTodo)
      ).subscribe({
        next: ({ provider, value }) => console.log({ provider, value }),
        error: (error) => console.warn(error)
      });

    // to avoid multiple subscription connections and responses when 
    // an item is created, unsubscribe as below
    return () => deletesub.unsubscribe();
  }, []);

  async function setAuthListener() {
    Hub.listen('auth', (data) => {
      switch (data.payload.event) {
        case 'signIn':
          //updateUser(data.payload.data);
          checkUser();
          updateAuthActionCount(authactioncount+1);
          break;
        case 'signOut':
          updateUser(null);
          updateAuthActionCount(authactioncount+1);
          break;
        case 'sessionExpired':
          updateUser(null);
          updateAuthActionCount(authactioncount+1);
          break;
        default:
          break;
      }
    });
  }

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

  function setTodos(data) {
    console.log('set Todo data', data);
    //updateTodo(data.listTodos.items.filter(function (a) {
    //                                       return !a._deleted}));
    buildTable(data.listTodos.items);
  }

  function handleGetTodoError(error) {
    console.log('handleGetTodoError', error);
    if (error.data) {
      console.log('data available', error.data);
      updateToDoTable('Unable to query: ' + error.errors[0].message)
    }
    else {
      updateToDoTable('Unable to query: ' + error.message);
    }
  }
 
  async function queryGraphql() {
    updateToDoTable(null);
    const allTodos = await API.graphql({ query: queries.listTodos,
                                         authMode: authmode })
                     .then((response) => setTodos(response.data))
                     .catch((error) => handleGetTodoError(error));
  }

  function handleCreateTodoError(error) {
    console.log('handlecreatetotoerror', error);
    if (error.data) {
      updateCreateMessage('Error creating ToDo: ' + error.errors[0].message);
    }
    else
      updateCreateMessage('Error creating ToDo: ' + error.message);
  }

  async function createGraphql(event) {
    //  prevent page from refreshing
    event.preventDefault();
    console.log('createGraphql event', event);
    const tododata = {
      name: event.target[0].value,
      description: event.target[1].value
    }

    const createdata = await API.graphql({ query: mutations.createTodo,
                                           variables: { input: tododata }})
                       .then((response) => console.log('created todo', response))
                       .catch((error) => handleCreateTodoError(error));
  }

  function buildTable(items) {
    updateToDoTable(
      <table>
        <thead>
          <tr>
            <th>id</th>
            <th>_version</th>
            <th>name</th>
            <th>description</th>
            <th>_deleted</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            return (
              <tr key={i}>
                <td>{item.id}</td>
                <td>{item._version}</td>
                <td>{item.name}</td>
                <td>{item.description}</td>
                <td>{item._deleted ? 'true' : 'false'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    ); 
  }

/*
invoke url from api gateway configuration:
https://k2dao4cir9.execute-api.us-east-1.amazonaws.com/test
*/
  async function getApi(event) {
    console.log('lambda query event', event);

    updateToDoTable(null);

    //  even if user is signed in, it is recommended to call
    //  Auth.currentSession() to make sure the user token is
    //  refreshed and valid.

    //  see what cognito info Auth.currentSession() returns as
    //  there may be a need to change Authorization in requestData
    //  below.

    let requestData = {};

    if (user) {
      const usersession = Auth.currentSession();
      console.log('usersession', usersession);
      console.log('user', user);

      requestData = {
        headers: {
            // use idToken under Authorization to get through the
            // API Gateway. Inside the Lambda, use accessToken under
            // DBAuthorization (can use any name for the header attribute)
            // for table access; the accessToken will carry needed info to
            // enforce table auth rules
            Authorization: user.signInUserSession.idToken.jwtToken,
            DBAuthorization: user.signInUserSession.accessToken.jwtToken
        },
        response: true
        //queryStringParameters: {
        //  name: 'ham'
        //}
      }
    } else {
      // unauthenticated users are allowed through AWS_IAM
      // configuration of the API Gateway and Dynamo table
      console.log('unauthenticated user');
      requestData = {
        headers: {},
        response: true
      }
    }

    // an additional path is setup in the API Gateway that allows
    // unauthenticated users to query
    const path = user ? '/items' : '/items/guests';
 
    const data = await API.get('todoApi', path, requestData)
                       .then((response) => {
                         buildTable(response.data.data.listTodos.items);
                       })
                       .catch((error) => {
                         console.log('api.get error', error);
                         updateToDoTable('Error with query: ' + error.message);
                       })
  }

  async function getFilteredApi(event) {
    //  prevent page from refreshing
    event.preventDefault();

    updateToDoTable(null);
    let requestData = {};

    if (user) {
      const usersession = Auth.currentSession();
      console.log('usersession', usersession);

      requestData = {
        headers: {
          Authorization: user.signInUserSession.idToken.jwtToken,
          DBAuthorization: user.signInUserSession.accessToken.jwtToken
        },
        response: true,
        queryStringParameters: {
          name: event.target[0].value
        }
      }
    } else {
      // unauthenticated users are allowed to query
      requestData = {
        headers: {},
        response: true,
        queryStringParameters: {
          name: event.target[0].value
        }
      }
    }

    // an additional path is setup in the API Gateway that allows
    // unauthenticated users to query
    const path = user ? '/items' : '/items/guests';
    console.log('path', path);
 
    const data = await API.get('todoApi', path, requestData)
                       .then((response) => {
                         buildTable(response.data.data.listTodos.items);
                       })
                       .catch((error) => {
                         console.log('api.get error', error);
                         updateToDoTable('Error with query: ' + error.message);
                       })
  }

  async function createApi(event) {
    //  prevent page from refreshing
    event.preventDefault();
    if (!user) {
      updateCreateMessage('Must be logged in to Create');
      return;
    }

    const requestData = {
        headers: {
            Authorization: user.signInUserSession.idToken.jwtToken,
            DBAuthorization: user.signInUserSession.accessToken.jwtToken
        },
        body: {
          name: event.target[0].value,
          description: event.target[1].value
        }
    }
    const data = await API.post('todoApi', '/items', requestData)
                       .then((response) => {
                         console.log('api.post response', response);
                         updateCreateMessage('Created id: ' + response.data.createTodo.id);
                       })
                       .catch((error) => {
                         console.log('api.post error', error.response);
                         updateCreateMessage('Error creating: ' + error.response.data.errors[0].message);
                       })
  }

  async function updateApi(event) {
    //  prevent page from refreshing
    event.preventDefault();
    if (!user) {
      updateUpdateMessage('Must be logged in to update items');
      return;
    }
    console.log('update id', event.target[0].value);
    console.log('update version', event.target[1].value);

    const requestData = {
        headers: {
            Authorization: user.signInUserSession.idToken.jwtToken,
            DBAuthorization: user.signInUserSession.accessToken.jwtToken
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
                         updateUpdateMessage('Updated item to version ' + response.data.updateTodo._version);
                       })
                       .catch((error) => {
                         console.log('api.put error', error.response);
                         updateUpdateMessage('Error updating: ' + error.response.data.errors[0].message);
                       })
  }

  async function deleteApi(event) {
    //  prevent page from refreshing
    event.preventDefault();
    if (!user) {
      updateDeleteMessage('Must be logged in to delete items');
      return;
    }
    console.log('delete id', event.target[0].value);
    console.log('delete version', event.target[1].value);

    const requestData = {
        headers: {
            Authorization: user.signInUserSession.idToken.jwtToken,
            DBAuthorization: user.signInUserSession.accessToken.jwtToken
        },
        body: {
          id: event.target[0].value,
          version: event.target[1].value
        }
    }

    const data = await API.del('todoApi', '/items', requestData)
                       .then((response) => {
                         console.log('api.del response', response);
                         updateDeleteMessage('Deleted item as version ' + response.data.deleteTodo._version);
                       })
                       .catch((error) => {
                         console.log('api.del error', error.response);
                         updateDeleteMessage('Error deleting: ' + error.response.data.errors[0].message);
                       })
  }

  if (!publiccode)
    getCode('public', 'index.js', updatePublicCode);

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
        <button onClick={queryGraphql}>Client Query ToDo</button>
        <p />
        <button onClick={getApi}>Lambda Query ToDo</button>
        <form onSubmit={getFilteredApi}>
          <label>Name Contains:
            <input type="text" name="name" />
          </label>
          <br />
          <input type="submit" value="Lambda Query By Name" />
        </form>
        <p />
        {todotable ? todotable
                   : 'No data available'
        }
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
          <input type="submit" value="Lambda Create ToDo" />
        </form>
        <p />
        {createmessage}
        <hr />
      </div>
      <p />
      <div>
        <hr />
        <form onSubmit={createGraphql}>
          <label>Name:
            <input type="text" name="name" />
          </label>
          <br />
          <label>Description:
            <input type="text" name="description" size="50" />
          </label>
          <br />
          <input type="submit" value="Client Create ToDo" />
        </form>
        <p />
        {createmessage}
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
          <input type="submit" value="Lambda Update ToDo" />
        </form>
        <p />
        {updatemessage}
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
          <input type="submit" value="Lambda Delete ToDo" />
        </form>
        <p />
        {deletemessage}
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
