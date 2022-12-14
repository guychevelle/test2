export type AmplifyDependentResourcesAttributes = {
    "auth": {
        "userPoolGroups": {
            "authorsGroupRole": "string",
            "adminsGroupRole": "string"
        },
        "test2Auth": {
            "IdentityPoolId": "string",
            "IdentityPoolName": "string",
            "UserPoolId": "string",
            "UserPoolArn": "string",
            "UserPoolName": "string",
            "AppClientIDWeb": "string",
            "AppClientID": "string"
        }
    },
    "storage": {
        "test2": {
            "BucketName": "string",
            "Region": "string"
        }
    },
    "api": {
        "test2db": {
            "GraphQLAPIIdOutput": "string",
            "GraphQLAPIEndpointOutput": "string"
        },
        "todoApi": {
            "RootUrl": "string",
            "ApiName": "string",
            "ApiId": "string"
        }
    },
    "function": {
        "test2function": {
            "Name": "string",
            "Arn": "string",
            "Region": "string",
            "LambdaExecutionRole": "string"
        }
    }
}