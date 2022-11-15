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

//const query = /* GraphQL */ `
//  mutation UPDATE_TODO($input: UpdateTodoInput!) {
//    updateTodo(input: $input) {
//      id
//      _version
//      name
//      description
//    }
//  }
//`;

const query = /* GraphQL */ `
  query LIST_TODOS($filter: ModelTodoFilterInput!) {
    listTodos (filter: $filter) {
      items {
        id
        name
        description
        _version
        _deleted
      }
    }
  }
`;

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export const handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const endpoint = new URL(GRAPHQL_ENDPOINT);

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: AWS_REGION,
    service: 'appsync',
    sha256: Sha256
  });

  let filter = {
    _version: {
      gt: 2
    }
  };

  const variables = {
    filter: {
      _version: {
        gt: 2
      }
    }
  };

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
    statusCode = 500;
    body = {
      errors: [
        {
          message: error.message
        }
      ]
    };
  }

  return {
    statusCode,
    body: JSON.stringify(body)
  };
};

