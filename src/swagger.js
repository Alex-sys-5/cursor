module.exports = {
	openapi: '3.0.0',
	info: {
		title: 'MediWave API',
		description: 'REST API для медитаций',
		version: '1.0.0'
	},
	servers: [
		{ url: 'http://localhost:3000', description: 'Local' }
	],
	components: {
		schemas: {
			Meditation: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					title: { type: 'string' },
					description: { type: 'string' },
					durationSec: { type: 'integer' },
					category: { type: 'string' },
					audioUrl: { type: 'string', format: 'uri' },
					imageUrl: { type: 'string', format: 'uri' }
				}
			}
		}
	},
	paths: {
		'/api/health': {
			get: {
				summary: 'Проверка здоровья',
				responses: { '200': { description: 'OK' } }
			}
		},
		'/api/meditations': {
			get: {
				summary: 'Список медитаций',
				responses: {
					'200': {
						description: 'OK',
						content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Meditation' } } } }
					}
				}
			},
			post: {
				summary: 'Создать медитацию',
				requestBody: {
					required: true,
					content: { 'application/json': { schema: { $ref: '#/components/schemas/Meditation' } } }
				},
				responses: { '201': { description: 'Created' }, '400': { description: 'Validation error' } }
			}
		},
		'/api/meditations/{id}': {
			get: {
				summary: 'Получить медитацию',
				parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'string' } } ],
				responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } }
			},
			put: {
				summary: 'Обновить медитацию',
				parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'string' } } ],
				requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Meditation' } } } },
				responses: { '200': { description: 'OK' }, '400': { description: 'Validation error' }, '404': { description: 'Not found' } }
			},
			delete: {
				summary: 'Удалить медитацию',
				parameters: [ { name: 'id', in: 'path', required: true, schema: { type: 'string' } } ],
				responses: { '200': { description: 'Deleted' }, '404': { description: 'Not found' } }
			}
		}
	}
};