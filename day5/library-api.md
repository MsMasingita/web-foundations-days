# Library Books REST API Design

## Endpoints

### 1. List All Books

- **Method:** `GET`
- **Path:** `/api/v1/books`
- **Description:** Retrieves a list of all books in the library catalogue.
- **Success Status Code:** `200 OK`

### 2. List Books by Author

- **Method:** `GET`
- **Path:** `/api/v1/books?author={authorName}`
- **Description:** Retrieves a list of books filtered by author name using a query parameter.
- **Success Status Code:** `200 OK`

### 3. Get One Book

- **Method:** `GET`
- **Path:** `/api/v1/books/:id`
- **Description:** Retrieves the details of a single book by its unique ID.
- **Success Status Code:** `200 OK`

### 4. Create a Book

- **Method:** `POST`
- **Path:** `/api/v1/books`
- **Description:** Adds a new book entry to the library catalogue.
- **Success Status Code:** `201 Created`
- **Request Body Example:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958,
  "isbn": "9780385474542",
  "genre": "Fiction"
}
```
