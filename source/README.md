# Beacoder Backend

Backend API for the Beacoder online learning platform. It provides authentication, course and curriculum management, learning progress tracking, assignments, discussions, notifications, and administrator operations.

## Contents

- [Technology stack](#technology-stack)
- [Requirements](#requirements)
- [Local setup](#local-setup)
- [Configuration](#configuration)
- [Running the server](#running-the-server)
- [Useful URLs](#useful-urls)
- [Database tables](#database-tables)
- [API conventions](#api-conventions)
- [API reference](#api-reference)
- [Infrastructure deployment](#infrastructure-deployment)

## Technology stack

- Node.js and Express 5
- PostgreSQL
- Sequelize 6 ORM
- JSON Web Tokens (JWT) for authentication
- bcrypt for password hashing
- Swagger UI and swagger-jsdoc for API documentation
- Helmet for HTTP security headers
- CORS for cross-origin requests
- Morgan for HTTP request logging
- dotenv for environment configuration
- Nodemon for local development
- AWS/Terraform infrastructure files are available in the sibling `infra` directory

## Requirements

- Node.js 18 or newer (Node.js 20+ is recommended)
- npm
- PostgreSQL database, locally or remotely accessible
- A database connection string
- A JWT secret
- Git, if cloning the repository

The backend does not include PostgreSQL itself. PostgreSQL must be running before the API starts.

## Local setup

From this directory:

```bash
npm install
touch .env
```

Populate `.env` manually using the configuration below.

Create an empty PostgreSQL database, then set its connection string in `.env`. Example:

```env
PORT=3000
PG_DB_URI=postgres://postgres:postgres@localhost:5432/beacoder
JWT_SECRET_KEY=replace-with-a-long-random-secret
```

Use a URL-encoded password if the PostgreSQL password contains characters such as `@`, `:`, `/`, or `#`.

## Configuration

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | No | `3000` | Port used by Express |
| `PG_DB_URI` | Yes | None | PostgreSQL connection URI used by Sequelize |
| `JWT_SECRET_KEY` | Yes | None | Secret used to sign and verify login tokens |

Do not commit `.env` or real credentials to source control.

## Running the server

Development mode with automatic restart:

```bash
npm run dev
```

Production-style start:

```bash
npm start
```

The server connects to PostgreSQL, synchronizes the Sequelize models, and then listens on `0.0.0.0:<PORT>`. The current development database configuration uses `sequelize.sync({ alter: true })` to create and synchronize the schema from the models. `Courses.isActive` is a non-null boolean that defaults to `false`: new courses must be explicitly activated. The content importer maps the workbook's boolean `Active` field to `isActive`; missing activation must remain inactive. Existing explicit activation values are not reset by this default.

Enrollment requires `isActive === true`. Direct creation, bulk creation, upserts, course reassignment, and enrollment reactivation are guarded at the enrollment model; ordinary progress updates and deactivation are unchanged. Course creation and updates accept only boolean `isActive` values. Catalogue/detail/enrolled-course responses expose `isActive`; curriculum and roadmap responses retain inactive courses so the UI can show locks. Stream and curriculum search results include only active courses.

The `/content-editor` API is restricted to `admin` and `instructor` accounts; `instructor` is the only tutor/instructor role defined by the user model. It provides course/topic/subtopic selectors and editable lesson sections. Updates accept only a section's HTML `description`; server-side sanitization preserves formatted lesson markup while preventing edits to headings, block type, and order. After saving, instructors can verify the result on the lesson page, which fetches `GET /courses/:courseId/topics/:topicId/subtopics/:subtopicId/contents`. Content-block create/update/delete endpoints are also restricted to admin and instructor accounts.

Offline backend tests (no environment configuration or database connection):

```bash
node --test tests/*.test.js
```

## Useful URLs

When running locally on the default port:

- API base URL: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/api-docs`
- Health/root URL: `http://localhost:3000/` (unless handled by another route)

The frontend should set its API base URL to `http://localhost:3000` so requests resolve to `http://localhost:3000/api/v1/...`.

## Database tables

Sequelize models are in `models/`. The following tables are used by the current backend:

| Table/model | Purpose | Main relationships |
| --- | --- | --- |
| `Users` | Learner, instructor, and administrator accounts | Owns enrollments, subtopic reviews, assignments, notifications, discussions, and replies |
| `Courses` | Course catalogue and course metadata | Belongs to an instructor; has enrollments, topics, assignments, and discussions |
| `CourseEnrollments` | User enrollment and course review-coverage percentage | Joins `Users` and `Courses`; percentage is reviewed active subtopics divided by active subtopics in that course |
| `CourseTopics` | Topics belonging to courses | Belongs to `Courses`; has subtopics and assignments |
| `Subtopics` | Subtopics belonging to topics | Has content blocks and assignments |
| `ContentBlocks` | Lesson/content units inside subtopics | Belongs to `Subtopics` |
| `UserSubtopicReviews` | One current review selection per user and subtopic (`UNDERSTOOD`, `NEEDS_MORE`, or `NOT_GOOD`) | Joins `Users` and `Subtopics`; unique on `(userId, subtopicId)` |
| `StudentProgress` | Student dashboard progress, live-interview, and mock-test counters | One row per student; course and assignment counts are derived from their existing tables |
| `Assignments` | Assignment catalogue linked to courses/topics/subtopics | Has user assignments and discussions |
| `UserAssignments` | One assigned-work record per user and catalogue assignment, including submission and review state | Joins `Users` and `Assignments`; records the assigning user |
| `Notification` | User notifications | Belongs to `Users` |
| `Discussion` | Learner discussions and pair-programming requests | Belongs to users and courses; may link to assignments |
| `DiscussionReply` | Replies to discussions | Joins `Users` and `Discussion` |
| `Recruiter` | Company or person referral details with creator-owned application status | Belongs to the creating `Users` record |

The previous achievement/badge tables and code are intentionally not part of this backend. No `Badge` or `UserBadge` model is created.

## API conventions

- All endpoints are prefixed with `/api/v1`.
- Send JSON using `Content-Type: application/json`.
- Protected endpoints require:

	```http
	Authorization: Bearer <token>
	```

- Login returns the token. Use that token for subsequent learner, instructor, or administrator requests.
- Successful responses generally contain `success: true` and either `data`, `message`, or a resource-specific property.
- Errors generally contain an HTTP error status and a JSON `message` or `error` property.
- Endpoints marked **Auth** require a token. Assignment-management endpoints marked **Admin or instructor** require either role where enforced by middleware.

## API reference

The Swagger UI at `/api-docs` is the authoritative interactive reference. The tables below provide a simple overview of the currently registered routes, expected input, typical positive output, and the main tables involved.

### Authentication

| Method and endpoint | Auth | Input | Positive response | Tables |
| --- | --- | --- | --- | --- |
| `POST /auth/signup` | Public | JSON: `name`, `email`, `phone`, `password`, `role`; optional `address`, `officeCollege` | `201`: registration success and user information | `Users` |
| `POST /auth/login` | Public | JSON: `email`, `password` | `200`: login message, JWT `token`, user, and role | `Users` |

### User and learning progress

| Method and endpoint | Auth | Input | Positive response | Tables |
| --- | --- | --- | --- | --- |
| `GET /user` | Public | None | Basic user route response | None |
| `GET /user/profile` | Auth | None | Current user's profile | `Users` |
| `GET /user/my-courses` | Auth | None | Enrolled courses with reviewed-subtopic coverage percentage and `isActive` state | `Users`, `CourseEnrollments`, `Courses` |
| `POST /user/:courseId/enroll` | Auth | Path: `courseId` | `201`: enrollment record; `403` when the course is inactive; `404` when missing | `Users`, `Courses`, `CourseEnrollments` |
| `GET /user/subtopics/:subtopicId/review` | Auth | Path: `subtopicId` | Current selection (or `null`) and saved course review-coverage percentage | `Users`, `Subtopics`, `CourseTopics`, `CourseEnrollments`, `UserSubtopicReviews` |
| `POST /user/subtopics/:subtopicId/review` | Auth | Path: `subtopicId`; JSON: `{ "selection": "UNDERSTOOD" }` (`NEEDS_MORE` or `NOT_GOOD` also accepted) | Saves or replaces the user's selection and updates course review coverage; no comment is stored | `Users`, `Subtopics`, `CourseTopics`, `CourseEnrollments`, `UserSubtopicReviews` |

The course percentage is review coverage, not a measure of understanding: any of the three selections marks that subtopic as reviewed. The existing `CourseEnrollments.completionPercentage` field stores this percentage. This is a fresh deployment; the new `UserSubtopicReviews` table is created from its Sequelize model at startup. No migration or cleanup of legacy progress data is required.

### Courses, topics, subtopics, and content

| Method and endpoint | Auth | Input | Positive response | Tables |
| --- | --- | --- | --- | --- |
| `POST /courses` | Usually admin/instructor at application level | Course JSON object | Created course | `Courses`, `Users` |
| `GET /courses` | Auth | None | All non-enrolled courses, including inactive courses; each includes `isActive` so clients can show inactive courses as locked | `Courses`, `CourseEnrollments` |
| `GET /courses/:courseId` | Public route | Path: `courseId` | Course details, including `isActive` | `Courses` |
| `PATCH /courses/:courseId` | Usually admin/instructor at application level | Path plus fields to update | Updated course | `Courses` |
| `DELETE /courses/:courseId` | Usually admin/instructor at application level | Path: `courseId` | Delete confirmation | `Courses` |
| `POST /courses/:courseId/topics` | Usually admin/instructor | Topic JSON object | Created topic | `Courses`, `CourseTopics` |
| `POST /courses/:courseId/topics/bulk` | Usually admin/instructor | JSON array/object containing topics | Created topics | `Courses`, `CourseTopics` |
| `GET /courses/:courseId/topics` | Public route | Path: `courseId` | Topics for the course | `Courses`, `CourseTopics` |
| `GET /courses/:courseId/topics/:topicId` | Public route | Path parameters | Topic details | `Courses`, `CourseTopics` |
| `PATCH /courses/:courseId/topics/:topicId` | Usually admin/instructor | Path plus topic fields | Updated topic | `CourseTopics` |
| `DELETE /courses/:courseId/topics/:topicId` | Usually admin/instructor | Path parameters | Delete confirmation | `CourseTopics` |
| `POST /courses/:courseId/topics/:topicId/subtopics` | Usually admin/instructor | Subtopic JSON object | Created subtopic | `CourseTopics`, `Subtopics` |
| `POST /courses/:courseId/topics/:topicId/subtopics/bulk` | Usually admin/instructor | JSON array/object containing subtopics | Created subtopics | `CourseTopics`, `Subtopics` |
| `GET /courses/:courseId/topics/:topicId/subtopics` | Public route | Path parameters | Subtopics for the topic | `CourseTopics`, `Subtopics` |
| `GET /courses/:courseId/topics/:topicId/subtopics/:subtopicId` | Public route | Path parameters | Subtopic details | `Subtopics` |
| `PATCH /courses/:courseId/topics/:topicId/subtopics/:subtopicId` | Usually admin/instructor | Path plus fields to update | Updated subtopic | `Subtopics` |
| `DELETE /courses/:courseId/topics/:topicId/subtopics/:subtopicId` | Usually admin/instructor | Path parameters | Delete confirmation | `Subtopics` |
| `POST /courses/:courseId/topics/:topicId/subtopics/:subtopicId/contents` | Usually admin/instructor | Content block JSON object | Created content block | `Subtopics`, `ContentBlocks` |
| `GET /courses/:courseId/topics/:topicId/subtopics/:subtopicId/contents` | Public route | Path parameters | Content blocks for a subtopic | `Subtopics`, `ContentBlocks` |
| `PATCH /courses/:courseId/topics/:topicId/subtopics/:subtopicId/contents/:contentId` | Usually admin/instructor | Path plus fields to update | Updated content block | `ContentBlocks` |
| `DELETE /courses/:courseId/topics/:topicId/subtopics/:subtopicId/contents/:contentId` | Usually admin/instructor | Path parameters | Delete confirmation | `ContentBlocks` |

### Curriculum

| Method and endpoint | Auth | Input | Positive response | Tables |
| --- | --- | --- | --- | --- |
| `GET /curriculum` | Auth | None | Career domains with job-ready programs, ordered courses, topics, subtopics, and totals | `CareerRoadmapCourses`, `Courses`, `CourseTopics`, `Subtopics` |
| `GET /curriculum/search?q=<text>` | Auth | Query: `q` | Matching course/topic/subtopic results | `Courses`, `CourseTopics`, `Subtopics` |
| `GET /curriculum/roadmap` | Auth | None | Career domains grouped into job-ready programs with ordered active courses | `CareerRoadmapCourses`, `Courses` |
| `GET /curriculum/streams/:stream` | Auth | Path: `stream` | Active courses in the selected stream | `Courses`, `CourseTopics`, `Subtopics` |

### Assignments

| Method and endpoint | Auth | Input | Positive response | Tables |
| --- | --- | --- | --- | --- |
| `POST /assignments` | Admin or instructor | Assignment JSON: title, description, `subtopicKey`, submission type, marks, dates | `201`: created catalogue assignment | `Assignments`, `Subtopics` |
| `GET /assignments/available?courseId=&topicId=&subtopicKey=` | Admin or instructor | Course required; topic and subtopic key optional | Active catalogue assignments matching the validated hierarchy | `Assignments`, `Courses`, `CourseTopics`, `Subtopics` |
| `GET /assignments/eligible-users?courseId=` | Admin or instructor | Course ID | Active student accounts with an active enrollment | `Users`, `Courses`, `CourseEnrollments` |
| `POST /assignments/assign` | Admin or instructor | JSON: `courseId`, `subtopicKey`, `assignmentIds`, `userIds` (optional `topicId` for hierarchy validation) | Allocates the assignment/user cross product to eligible users and reports created, duplicate, and ignored counts | `UserAssignments`, `Assignments`, `Users`, `CourseEnrollments` |
| `GET /assignments/my-assignments` | Auth | Optional `status`: `assigned`, `in_progress`, `submitted`, or `completed` | Current user's assigned work | `UserAssignments`, `Assignments`, `Subtopics`, `CourseTopics`, `Courses` |
| `GET /assignments/my-assignments/stats` | Auth | None | Per-user submitted and pending assignment counts | `UserAssignments`, `Users` |
| `POST /assignments/user/:userAssignmentId/start` | Auth, owner only | Path: user-assignment ID | Moves assigned work to `in_progress`, recording its first start time | `UserAssignments` |
| `POST /assignments/:userAssignmentId/submit` | Auth, owner only | JSON: `textAnswer` and/or `submissionUrl` | Submits or resubmits until reviewed | `UserAssignments`, `Assignments`, `Users` |
| `GET /assignments/admin/submitted` | Instructor | Optional pagination, course, and pending/reviewed status | Paginated submitted/completed work with pending/reviewed counts | `UserAssignments`, `Assignments`, `Users`, `Courses` |
| `GET /assignments/admin/submitted/:submissionId` | Instructor | Path: user-assignment ID | Assignment, course, and learner details | `UserAssignments`, `Assignments`, `Users`, `Courses` |
| `POST /assignments/admin/submitted/:submissionId` | Instructor | JSON: `status: completed`, `marksObtained`, optional `feedback` | Completes review when submitted and marks are within the assignment maximum | `UserAssignments`, `Assignments`, `Users` |

### Discussions and pair programming

| Method and endpoint | Auth | Input | Positive response | Tables |
| --- | --- | --- | --- | --- |
| `POST /discussions` | Auth | Discussion JSON, typically title/content/course or assignment context | Created discussion | `Discussion`, `Users`, `Courses`, `Assignments` |
| `GET /discussions` | Auth | Optional `scope=all` or `scope=me` | Student discussions | `Discussion`, `Users`, `Courses`, `Assignments`, `DiscussionReply` |
| `GET /discussions/:id` | Auth | Path: discussion ID | Discussion with replies | `Discussion`, `DiscussionReply`, `Users` |
| `POST /discussions/:id/replies` | Auth | JSON reply content | Created reply | `Discussion`, `DiscussionReply`, `Users` |
| `POST /discussions/pair-programming/:discussionId` | Auth | Pair-programming request/status JSON | Updated request | `Discussion`, `Users` |
| `GET /discussions/admin` | Auth/admin application-level | Optional filters | Admin discussion list | `Discussion`, `Users`, `Courses` |
| `GET /discussions/admin/:id` | Auth/admin application-level | Path: discussion ID | Admin discussion details | `Discussion`, `DiscussionReply`, `Users` |
| `PATCH /discussions/admin/:id` | Auth/admin application-level | Status/update JSON | Updated discussion | `Discussion`, `Users` |
| `POST /discussions/admin/:id/replies` | Auth/admin application-level | Reply JSON | Created admin reply | `Discussion`, `DiscussionReply`, `Users` |
| `GET /discussions/admin/pair-programming` | Auth/admin application-level | Optional filters | Pair-programming discussions | `Discussion`, `Users` |
| `PATCH /discussions/admin/:id/pair-programming-status` | Auth/admin application-level | Status JSON | Updated pair-programming status | `Discussion`, `Users` |

### Notes

| Method and endpoint | Auth | Input | Positive response | Tables |
| --- | --- | --- | --- | --- |

### Notifications

| Method and endpoint | Auth | Input | Positive response | Tables |
| --- | --- | --- | --- | --- |
| `POST /notifications` | Admin | JSON notification payload and recipient information | Created notification(s) | `Notification`, `Users` |
| `GET /notifications/me` | Auth | None or supported pagination/filter query | Current user's notifications | `Notification`, `Users` |
| `GET /notifications/me/unread-count` | Auth | None | Unread notification count | `Notification`, `Users` |
| `PATCH /notifications/me/mark-read` | Auth | JSON containing notification IDs or supported mark-read selection | Updated read status | `Notification`, `Users` |

### Recruiters

| Method and endpoint | Auth | Input | Positive response | Tables |
| --- | --- | --- | --- | --- |
| `GET /recruiters?view=mine` | Candidate or Admin | Optional `view=mine` | Creator's recruiter records, including status | `Recruiter`, `Users` |
| `GET /recruiters` | Premium candidate or Admin | None | Kyrox Recruitment Partners records; candidate responses omit application status | `Recruiter`, `Users` |
| `POST /recruiters` | Candidate or Admin | Type, name, location, technologies, hiring roles, career page, HR contact details, and optional status | `201`: created recruiter record with `createdBy` | `Recruiter`, `Users` |
| `PUT /recruiters/:id` | Creator or Admin | Recruiter fields to update | Updated recruiter record | `Recruiter`, `Users` |
| `DELETE /recruiters/:id` | Creator or Admin | Path: recruiter ID | Delete confirmation | `Recruiter`, `Users` |

Recruiter records support `Company` and `Person` types and these statuses: `Not applied`, `Applied`, `Interview scheduled`, `Selected`, and `Rejected`. Only the record creator or an Admin can update or delete a record. Sequelize synchronizes the new table through the existing `sync({ alter: true })` startup configuration.

### Administrator operations

| Method and endpoint | Auth | Input | Positive response | Tables |
| --- | --- | --- | --- | --- |
| `POST /admin/create` | Admin | JSON: `name`, `email`, `password`, `phone` | Created administrator | `Users` |
| `POST /admin/confirm-payment` | Admin | Payment/user confirmation JSON | Payment confirmation and affected users | `Users` |

## Example request flow

1. Call `POST /api/v1/auth/login` with email and password.
2. Store the returned JWT token securely on the client.
3. Send the token in the `Authorization` header for protected endpoints.
4. Enroll using `POST /api/v1/user/:courseId/enroll`.
5. Load course content using the course/topic/subtopic endpoints.
6. At the end of a subtopic, save a review selection using `POST /api/v1/user/subtopics/:subtopicId/review` with `selection` set to `UNDERSTOOD`, `NEEDS_MORE`, or `NOT_GOOD`.
7. An administrator or instructor allocates assignments to eligible enrolled students; students start and submit their assigned work. Add discussions as needed.

## Infrastructure deployment

Terraform files for AWS deployment are in `../infra` relative to this source directory. From the infrastructure directory:

```bash
terraform init
terraform plan -var-file="beacoder-dev-ap-south-1.tfvars"
terraform apply -var-file="beacoder-dev-ap-south-1.tfvars"
```

Review the Terraform variables and AWS credentials before applying infrastructure changes. Never publish private keys, database passwords, or other secrets.
