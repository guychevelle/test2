import crypto from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest } from '@aws-sdk/protocol-http';
//import { default as fetch, Request } from 'node-fetch';
import { Request } from 'node-fetch';

const { default: fetch } = await import('node-fetch');

const { Sha256 } = crypto;
const GRAPHQL_ENDPOINT = process.env.API_TEST2DB_GRAPHQLAPIENDPOINTOUTPUT;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const todoquery = /* GraphQL */ `
  query LIST_TODOS {
    listTodos {
      items {
        id
        name
        description
        _version
        _deleted
      }
    }
  }`;

const todocreate = /* GraphQL */ `
  mutation CREATE_TODO($input: CreateTodoInput!) {
    createTodo(input: $input) {
      id
      name
      description
    }
  }`;

const todoupdate = /* GraphQL */ `
  mutation UPDATE_TODO($input: UpdateTodoInput!) {
    updateTodo(input: $input) {
      id
      _version
      name
      description
    }
  }`;

const tododelete = /* GraphQL */ `
  mutation DELETE_TODO($input: DeleteTodoInput!) {
    deleteTodo(input: $input) {
      id
      _version
    }
  }`;

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export const handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  // from https://medium.com/rahasak/build-serverless-application-with-aws-amplify-aws-api-gateway-aws-lambda-and-cognito-auth-a8606b9cb025 
  // Step 9, enable CORS
  if (event.requestContext.authorizer) {
    console.log('CLAIMS: ', event.requestContext.authorizer.claims);
  }

  const endpoint = new URL(GRAPHQL_ENDPOINT);

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: AWS_REGION,
    service: 'appsync',
    sha256: Sha256
  });

  let variables = {};
  let query;

  if (event.httpMethod == 'GET') {
    variables = {};
    query = todoquery;
  } else if (event.httpMethod == 'PUT') {
    // update item
    // id and _version are needed to specify an item for update
    query = todoupdate;
    let tmp = JSON.parse(event.body);
    variables = {
      input: {
        id: tmp.id,
        _version: tmp.version,
        name: tmp.name,
        description: tmp.description
      }
    };
  } else if (event.httpMethod == 'POST') {
    // create item
    console.log('test2 lambda trying to create');
    // the 'body' comes in the event, but is a String. Need to
    // convert it to JSON to get elements
    query = todocreate;
    let tmp = JSON.parse(event.body);
    variables = {
      input: {
        name: tmp.name,
        description: tmp.description
      }
    };
  } else if (event.httpMethod == 'DELETE') {
    query = tododelete;
    let tmp = JSON.parse(event.body);
    variables = {
      input: {
        id: tmp.id,
        _version: tmp.version
      }
    };
  } else {
    console.log('unsupported method');
  }
    
  const requestToBeSigned = new HttpRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: endpoint.host
    },
    hostname: endpoint.host,
    body: JSON.stringify({ query, variables }),
    path: endpoint.pathname
  });

  const signed = await signer.sign(requestToBeSigned);
  const request = new Request(endpoint, signed);

  let statusCode = 200;
  let body;
  let response;

  try {
    response = await fetch(request);
    body = await response.json();
    if (body.errors) statusCode = 400;
  } catch (error) {
    statusCode = 400;
    body = {
      errors: [
        {
          status: response.status,
          message: error.message,
          stack: error.stack
        }
      ]
    };
  }

/*
  return body needs to be updated based on httpmethod calling in
    GET returns table data
    POST returns new table 'id'
    PUT returns? id?
    DELETE returns? id?
*/

  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*"
    },
    body: JSON.stringify(body)
  };
};

