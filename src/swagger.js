module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Users API',
    version: '1.0.0',
    description: 'Simple CRUD API for users with JSON and XML support.',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local server' },
  ],
  paths: {
    '/users': {
      get: {
        summary: 'List all users',
        responses: {
          '200': {
            description: 'Array of users',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/User' } },
              },
              'application/xml': {
                schema: { $ref: '#/components/schemas/UsersXml' },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserCreate' },
              examples: {
                jsonExample: {
                  summary: 'JSON example',
                  value: { name: 'Alice', email: 'alice@example.com' },
                },
              },
            },
            'application/xml': {
              schema: { $ref: '#/components/schemas/UserCreateXml' },
              examples: {
                xmlExample: {
                  summary: 'XML example',
                  value: '<User>\n  <name>Alice</name>\n  <email>alice@example.com</email>\n</User>',
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created user',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/User' } },
              'application/xml': { schema: { $ref: '#/components/schemas/UserXml' } },
            },
          },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/users/{id}': {
      put: {
        summary: 'Update a user by id',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserCreate' },
              examples: {
                jsonExample: {
                  summary: 'JSON example',
                  value: { name: 'Bob', email: 'bob@example.com' },
                },
              },
            },
            'application/xml': {
              schema: { $ref: '#/components/schemas/UserCreateXml' },
              examples: {
                xmlExample: {
                  summary: 'XML example',
                  value: '<User>\n  <name>Bob</name>\n  <email>bob@example.com</email>\n</User>',
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated user',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/User' } },
              'application/xml': { schema: { $ref: '#/components/schemas/UserXml' } },
            },
          },
          '400': { description: 'Validation error' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        summary: 'Delete a user by id',
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '204': { description: 'Deleted' },
          '404': { description: 'Not found' },
        },
      },
    },
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
      },
      UserCreate: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
      },
      UserXml: {
        type: 'object',
        xml: { name: 'User' },
        properties: {
          id: { type: 'integer', xml: { name: 'id' } },
          name: { type: 'string', xml: { name: 'name' } },
          email: { type: 'string', xml: { name: 'email' } },
        },
      },
      UserCreateXml: {
        type: 'object',
        xml: { name: 'User' },
        properties: {
          name: { type: 'string', xml: { name: 'name' } },
          email: { type: 'string', xml: { name: 'email' } },
        },
      },
      UsersXml: {
        type: 'object',
        xml: { name: 'Users' },
        properties: {
          User: {
            type: 'array',
            items: { $ref: '#/components/schemas/UserXml' },
            xml: { name: 'User', wrapped: true },
          },
        },
      },
    },
  },
};

