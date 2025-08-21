# Users API (Express, JSON/XML, Swagger)

Простое REST API на Node.js (Express) с поддержкой JSON и XML для ресурса `users`, документацией Swagger UI по пути `/api-docs`.

## Запуск

1. Установите зависимости:

```
npm install
```

2. Запустите сервер в dev-режиме (автоперезапуск):

```
npm run dev
```

или обычный запуск:

```
npm start
```

Сервер поднимется на `http://localhost:3000`.

Swagger UI: `http://localhost:3000/api-docs`.

## Эндпоинты

- GET `/users` – список пользователей
- POST `/users` – создать пользователя
- PUT `/users/:id` – обновить пользователя
- DELETE `/users/:id` – удалить пользователя

Данные хранятся в памяти процесса.

## Поддержка JSON и XML

Приложение понимает тело запроса как JSON (`Content-Type: application/json`) и как XML (`Content-Type: application/xml` или `text/xml`).

Формат ответа выбирается по заголовку `Accept`:
- `Accept: application/json` → JSON
- `Accept: application/xml` или `text/xml` → XML

Если `Accept` не указан, возвращается JSON.

### Примеры тел запросов

- JSON (POST/PUT):

```json
{
  "name": "Alice",
  "email": "alice@example.com"
}
```

- XML (POST/PUT):

```xml
<User>
  <name>Alice</name>
  <email>alice@example.com</email>
</User>
```

## Тестирование в Postman (JSON)

1. Создайте коллекцию и запросы:
   - GET `http://localhost:3000/users`
   - POST `http://localhost:3000/users` с заголовком `Content-Type: application/json` и телом как в примере JSON
   - PUT `http://localhost:3000/users/1` с заголовком `Content-Type: application/json` и телом как в примере JSON
   - DELETE `http://localhost:3000/users/1`
2. Убедитесь, что в `Accept` установлен `application/json` или заголовок отсутствует.

## Тестирование в SOAP UI (XML)

1. Создайте проект REST.
2. Добавьте запросы:
   - GET `http://localhost:3000/users` с заголовком `Accept: application/xml`
   - POST `http://localhost:3000/users` с заголовком `Content-Type: application/xml` и телом как в примере XML
   - PUT `http://localhost:3000/users/1` с заголовком `Content-Type: application/xml`
   - DELETE `http://localhost:3000/users/1`
3. Для ответов XML добавляйте `Accept: application/xml`.

## Swagger примеры

Откройте `http://localhost:3000/api-docs`. В разделе POST/PUT показаны примеры тел запроса для JSON и XML. Можно выполнять запросы прямо из UI (кнопка Try it out). Для получения XML-ответа задайте в Swagger UI `Response content type: application/xml`.

## Скрипты npm

- `npm start` — запустить сервер
- `npm run dev` — запустить сервер с `nodemon`

## Используемые пакеты

- `express` — сервер
- `express-xml-bodyparser` — парсинг XML-тел
- `xmlbuilder2` — генерация XML-ответов
- `swagger-ui-express` — Swagger UI по пути `/api-docs`
- `nodemon` — dev-перезапуск
