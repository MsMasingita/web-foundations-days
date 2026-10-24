# School Database Design

## Table Explanations

- **students**: Stores essential learner identity records, including a primary key (`id`), full `name`, and a `UNIQUE` `email` to prevent duplicate student profiles.
- **courses**: Stores curricular subjects available in the institution, holding a primary key (`id`), full course `title`, and a `UNIQUE` course `code` (e.g., CS101).
- **enrolments**: Serves as the junction (join) table connecting individual students to specific courses. It stores primary key `id`, foreign keys referencing `students(id)` and `courses(id)`, the awarded `grade`, and a composite `UNIQUE (student_id, course_id)` constraint to prevent a student from enrolling in the identical course more than once.

## Relationships & The Join Table

The relationship between `students` and `courses` is **many-to-many**: a single student can take multiple courses, and a single course can contain multiple students.

Relational database tables cannot directly represent many-to-many relationships without data duplication, comma-separated lists, or schema violations. A **join table** (`enrolments`) is required to break this many-to-many relationship down into two manageable **one-to-many** relationships:

1. One student to many enrolment records (`1:N`).
2. One course to many enrolment records (`1:N`).

This design normalizes the data, enforces referential integrity through foreign keys, and provides a clear place to store relationship-specific attributes such as the student's final grade.

## Proposed Index

```sql
CREATE INDEX idx_enrolments_student_id ON enrolments(student_id);
```
