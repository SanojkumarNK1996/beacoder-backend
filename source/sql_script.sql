-- ============================================
-- Insert default course data (safe for re-run)
-- ============================================

INSERT INTO public."Courses"
(
    id,
    "courseCode",
    "courseName",
    description,
    "imageUrl",
    "difficultyLevel",
    "estimatedHours",
    "isActive",
    "createdAt",
    "updatedAt",
    "instructorId"
)
VALUES
    -- 1. Java
    (
        1,
        'JAVA101',
        'Java',
        'Learn the fundamentals of Java programming including syntax, OOP concepts, and core libraries.',
        '/java.png',
        'easy',
        40,
        true,
        current_timestamp,
        current_timestamp,
        NULL
    ),

    -- 2. Advanced Java
    (
        2,
        'JAVA201',
        'Advanced Java',
        'Deep dive into Java frameworks and Spring basics for enterprise-grade applications.',
        '/advanced-java.png',
        'medium',
        50,
        true,
        current_timestamp,
        current_timestamp,
        NULL
    ),

    -- 3. Data Structures & Algorithms
    (
        3,
        'DSA101',
        'Data Structures & Algorithms',
        'Master essential data structures and algorithms to write efficient and optimized code.',
        '/dsa.png',
        'hard',
        60,
        true,
        current_timestamp,
        current_timestamp,
        NULL
    ),

    -- 4. Database Fundamentals
    (
        4,
        'DB101',
        'Database Fundamentals',
        'Learn SQL, normalization, and relational database concepts with hands-on examples.',
        '/database.png',
        'medium',
        35,
        true,
        current_timestamp,
        current_timestamp,
        NULL
    ),

    -- 5. Cloud Computing (AWS)
    (
        5,
        'CLOUD101',
        'Cloud Computing (AWS)',
        'Explore AWS cloud services like EC2, S3, and Lambda, and deploy scalable applications in the cloud.',
        '/aws.png',
        'medium',
        45,
        true,
        current_timestamp,
        current_timestamp,
        NULL
    ),

    -- 6. React JS
    (
        6,
        'REACT101',
        'React JS',
        'Learn modern React development — components, hooks, and building dynamic web applications.',
        '/react.png',
        'medium',
        50,
        true,
        current_timestamp,
        current_timestamp,
        NULL
    )
ON CONFLICT ("courseCode") DO NOTHING;

-- ============================================
-- Insert CourseTopics (Topics)(JAVA)
-- ============================================
INSERT INTO public."CourseTopics" 
(
    id,
    title, 
    description, 
    "displayOrder", 
    "isActive", 
    "createdAt", 
    "updatedAt", 
    "courseId"
) 
VALUES
(1, 'Introduction to Programming and Java', 'Goal: Introduce programming concepts and Java basics.', 1, true, current_timestamp, current_timestamp, 1),
(2, 'Basics of Java', 'Goal: Cover fundamental Java syntax and basic concepts.', 2, true, current_timestamp, current_timestamp, 1),
(3, 'Control Flow Statements', 'Goal: Teach decision-making and loops.', 3, true, current_timestamp, current_timestamp, 1),
(4, 'Methods / Functions', 'Goal: Introduce modular programming.', 4, true, current_timestamp, current_timestamp, 1),
(5, 'Object-Oriented Programming (OOP) in Java', 'Goal: Core Java concept: OOP.', 5, true, current_timestamp, current_timestamp, 1),
(6, 'Arrays and Collections', 'Goal: Handling multiple data efficiently.', 6, true, current_timestamp, current_timestamp, 1),
(7, 'Exception Handling', 'Goal: Handling errors in Java.', 7, true, current_timestamp, current_timestamp, 1),
(8, 'Multithreading and Concurrency (Advanced)', 'Goal: Advanced Java multithreading and concurrency concepts.', 8, true, current_timestamp, current_timestamp, 1),
(9, 'Java 8+ Features (Optional Advanced)', 'Goal: Modern Java features.', 9, true, current_timestamp, current_timestamp, 1)
ON CONFLICT ("title", "courseId") DO NOTHING;

-- ============================================
-- Insert Subtopics
-- ============================================
INSERT INTO public."Subtopics"
(
    id,
    title,
    description,
    "displayOrder",
    "isActive",
    "createdAt",
    "updatedAt",
    "topicId"
)
VALUES
-- Topic 1
(1, 'What is Programming?', 'Definition and purpose, Different programming languages', 1, true, current_timestamp, current_timestamp, 1),
(2, 'Introduction to Java', 'History of Java, Features of Java, JVM/JRE/JDK, Compiling and running Java programs', 2, true, current_timestamp, current_timestamp, 1),
(3, 'Setting up the Java Environment', 'Installing JDK, Setting up IDE (Eclipse, IntelliJ, VS Code), Writing your first Java program (Hello World)', 3, true, current_timestamp, current_timestamp, 1),

-- Topic 2
(4, 'Data Types', 'Primitive types (int, float, double, char, boolean, byte, short, long), Non-primitive types (Strings, Arrays)', 1, true, current_timestamp, current_timestamp, 2),
(5, 'Variables', 'Declaration and initialization, Naming conventions', 2, true, current_timestamp, current_timestamp, 2),
(6, 'Operators', 'Arithmetic, Relational, Logical, Assignment, Increment & decrement', 3, true, current_timestamp, current_timestamp, 2),
(7, 'Comments', 'Single-line, multi-line, and documentation comments', 4, true, current_timestamp, current_timestamp, 2),

-- Topic 3
(8, 'Conditional Statements', 'if, if-else, if-else-if, switch-case', 1, true, current_timestamp, current_timestamp, 3),
(9, 'Loops', 'for loop, while loop, do-while loop', 2, true, current_timestamp, current_timestamp, 3),
(10, 'Branching Statements', 'break, continue, return', 3, true, current_timestamp, current_timestamp, 3),

-- Topic 4
(11, 'Defining methods', 'Method parameters and return types, Method overloading, Recursion basics', 1, true, current_timestamp, current_timestamp, 4),

-- Topic 5
(12, 'Classes and Objects', 'Defining classes, Creating objects, Constructors', 1, true, current_timestamp, current_timestamp, 5),
(13, 'Fields and Methods', 'Instance vs. static members', 2, true, current_timestamp, current_timestamp, 5),
(14, 'Encapsulation', 'Access modifiers (private, public, protected), Getters and setters', 3, true, current_timestamp, current_timestamp, 5),
(15, 'Inheritance', 'extends keyword, super keyword, Method overriding', 4, true, current_timestamp, current_timestamp, 5),
(16, 'Polymorphism', 'Compile-time (method overloading), Runtime (method overriding)', 5, true, current_timestamp, current_timestamp, 5),
(17, 'Abstraction', 'Abstract classes, Abstract methods, Interfaces', 6, true, current_timestamp, current_timestamp, 5),
(18, 'Packages and Importing', '', 7, true, current_timestamp, current_timestamp, 5),
(19, 'this keyword', '', 8, true, current_timestamp, current_timestamp, 5),
(20, 'final keyword', '', 9, true, current_timestamp, current_timestamp, 5),

-- Topic 6
(21, 'Arrays', 'Single-dimensional and multi-dimensional arrays', 1, true, current_timestamp, current_timestamp, 6),
(22, 'Strings and String Methods', '', 2, true, current_timestamp, current_timestamp, 6),
(23, 'Collections Framework', 'ArrayList, LinkedList, HashMap, HashSet', 3, true, current_timestamp, current_timestamp, 6),
(24, 'Iterating collections', 'loops, for-each', 4, true, current_timestamp, current_timestamp, 6),

-- Topic 7
(25, 'Exception Handling', 'What are exceptions?, Types: checked vs. unchecked, Try-catch-finally, throw and throws, Custom exceptions', 1, true, current_timestamp, current_timestamp, 7),

-- Topic 8
(26, 'Multithreading', 'Creating threads, Thread lifecycle, Synchronization, Runnable interface', 1, true, current_timestamp, current_timestamp, 8),

-- Topic 9
(27, 'Java 8+ Features', 'Lambda expressions, Streams API, Optional class, Functional interfaces', 1, true, current_timestamp, current_timestamp, 9)

ON CONFLICT ("title", "topicId") DO NOTHING;


-- ============================================
-- Insert CourseTopics (Topics)(SQL)
-- ============================================
INSERT INTO public."CourseTopics"
(
    id,
    title,
    description,
    "displayOrder",
    "isActive",
    "createdAt",
    "updatedAt",
    "courseId"
)
VALUES
(10, 'Introduction to Databases', NULL, 1, true, current_timestamp, current_timestamp, 5),
(11, 'Database Concepts and Architecture', NULL, 2, true, current_timestamp, current_timestamp, 5),
(12, 'Introduction to SQL', NULL, 3, true, current_timestamp, current_timestamp, 5),
(13, 'Database Design', NULL, 4, true, current_timestamp, current_timestamp, 5),
(14, 'Creating and Modifying Database Objects', NULL, 5, true, current_timestamp, current_timestamp, 5),
(15, 'Data Manipulation (DML)', NULL, 6, true, current_timestamp, current_timestamp, 5),
(16, 'Advanced Querying', NULL, 7, true, current_timestamp, current_timestamp, 5),
(17, 'Views and Indexes', NULL, 8, true, current_timestamp, current_timestamp, 5),
(18, 'Transactions and Concurrency', NULL, 9, true, current_timestamp, current_timestamp, 5),
(19, 'Stored Procedures, Functions, and Triggers', NULL, 10, true, current_timestamp, current_timestamp, 5),
(20, 'SQL Performance and Optimization Basics', NULL, 11, true, current_timestamp, current_timestamp, 5),
(21, 'Backup, Restore, and Security Basics', NULL, 12, true, current_timestamp, current_timestamp, 5),
(22, 'Hands-On Projects / Practice', NULL, 13, true, current_timestamp, current_timestamp, 5)
ON CONFLICT ("title", "courseId") DO NOTHING;

-- ============================================
-- Insert Subtopics (clean hierarchy) with updated topicIds
-- ============================================
INSERT INTO public."Subtopics"
(
    title,
    description,
    "displayOrder",
    "isActive",
    "createdAt",
    "updatedAt",
    "topicId"
)
VALUES
-- Topic 10: Introduction to Databases
('What is a Database?', NULL, 1, true, current_timestamp, current_timestamp, 10),
('Types of Databases', 'Relational Databases (RDBMS), NoSQL Databases', 2, true, current_timestamp, current_timestamp, 10),
('Database vs File System', NULL, 3, true, current_timestamp, current_timestamp, 10),
('Real-world examples of databases', NULL, 4, true, current_timestamp, current_timestamp, 10),
('Importance of databases in software applications', NULL, 5, true, current_timestamp, current_timestamp, 10),

-- Topic 11: Database Concepts and Architecture
('Database Management System (DBMS) overview', NULL, 1, true, current_timestamp, current_timestamp, 11),
('Components of DBMS', 'DB Engine, Database Schema, Query Processor, Storage Manager', 2, true, current_timestamp, current_timestamp, 11),
('Client-Server Architecture', NULL, 3, true, current_timestamp, current_timestamp, 11),
('ACID Properties (Atomicity, Consistency, Isolation, Durability)', NULL, 4, true, current_timestamp, current_timestamp, 11),
('Transactions and concurrency', NULL, 5, true, current_timestamp, current_timestamp, 11),
('Keys in Databases', 'Primary Key, Foreign Key, Unique Key, Composite Key', 6, true, current_timestamp, current_timestamp, 11),

-- Topic 12: Introduction to SQL
('What is SQL?', NULL, 1, true, current_timestamp, current_timestamp, 12),
('SQL vs NoSQL', NULL, 2, true, current_timestamp, current_timestamp, 12),
('Types of SQL commands', 'DDL (Data Definition Language), DML (Data Manipulation Language), DCL (Data Control Language), TCL (Transaction Control Language)', 3, true, current_timestamp, current_timestamp, 12),
('SQL syntax basics', NULL, 4, true, current_timestamp, current_timestamp, 12),

-- Topic 13: Database Design
('Database Normalization', '1NF, 2NF, 3NF, BCNF', 1, true, current_timestamp, current_timestamp, 13),
('ER Diagrams (Entity-Relationship Modeling)', NULL, 2, true, current_timestamp, current_timestamp, 13),
('Relationships', 'One-to-One, One-to-Many, Many-to-Many', 3, true, current_timestamp, current_timestamp, 13),
('Indexing basics', NULL, 4, true, current_timestamp, current_timestamp, 13),
('Data types in SQL', NULL, 5, true, current_timestamp, current_timestamp, 13),

-- Topic 14: Creating and Modifying Database Objects
('Creating databases', NULL, 1, true, current_timestamp, current_timestamp, 14),
('Creating tables', NULL, 2, true, current_timestamp, current_timestamp, 14),
('Modifying tables', 'ALTER TABLE, Adding/Deleting columns', 3, true, current_timestamp, current_timestamp, 14),
('Dropping tables and databases', NULL, 4, true, current_timestamp, current_timestamp, 14),
('Constraints', 'NOT NULL, UNIQUE, PRIMARY KEY, FOREIGN KEY, CHECK, DEFAULT', 5, true, current_timestamp, current_timestamp, 14),

-- Topic 15: Data Manipulation (DML)
('Inserting data', NULL, 1, true, current_timestamp, current_timestamp, 15),
('Reading data', 'SELECT *, SELECT column_name, Filtering with WHERE, Sorting with ORDER BY, Limiting results (LIMIT/OFFSET)', 2, true, current_timestamp, current_timestamp, 15),
('Updating data', NULL, 3, true, current_timestamp, current_timestamp, 15),
('Deleting data', NULL, 4, true, current_timestamp, current_timestamp, 15),

-- Topic 16: Advanced Querying
('Aggregate functions', 'COUNT, SUM, AVG, MAX, MIN', 1, true, current_timestamp, current_timestamp, 16),
('Grouping data', 'GROUP BY, HAVING', 2, true, current_timestamp, current_timestamp, 16),
('Joins', 'INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN, CROSS JOIN', 3, true, current_timestamp, current_timestamp, 16),
('Subqueries', 'Single-row, Multi-row', 4, true, current_timestamp, current_timestamp, 16),
('Set operations', 'UNION, UNION ALL, INTERSECT, EXCEPT', 5, true, current_timestamp, current_timestamp, 16),

-- Topic 17: Views and Indexes
('Creating and using views', NULL, 1, true, current_timestamp, current_timestamp, 17),
('Advantages of views', NULL, 2, true, current_timestamp, current_timestamp, 17),
('Indexing', 'Primary index, Unique index, Composite index, Clustered vs Non-clustered indexes', 3, true, current_timestamp, current_timestamp, 17),

-- Topic 18: Transactions and Concurrency
('Transactions in SQL', 'BEGIN, COMMIT, ROLLBACK', 1, true, current_timestamp, current_timestamp, 18),
('Savepoints', NULL, 2, true, current_timestamp, current_timestamp, 18),
('Locks and concurrency control', NULL, 3, true, current_timestamp, current_timestamp, 18),
('Isolation levels', 'READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE', 4, true, current_timestamp, current_timestamp, 18),

-- Topic 19: Stored Procedures, Functions, and Triggers
('Introduction to stored procedures', NULL, 1, true, current_timestamp, current_timestamp, 19),
('Creating and executing procedures', NULL, 2, true, current_timestamp, current_timestamp, 19),
('User-defined functions', NULL, 3, true, current_timestamp, current_timestamp, 19),
('Triggers', 'BEFORE, AFTER triggers', 4, true, current_timestamp, current_timestamp, 19),
('Pros and cons of using procedures/functions/triggers', NULL, 5, true, current_timestamp, current_timestamp, 19),

-- Topic 20: SQL Performance and Optimization Basics
('Query execution plan', NULL, 1, true, current_timestamp, current_timestamp, 20),
('Index usage for optimization', NULL, 2, true, current_timestamp, current_timestamp, 20),
('Avoiding common pitfalls', NULL, 3, true, current_timestamp, current_timestamp, 20),
('Best practices in SQL queries', NULL, 4, true, current_timestamp, current_timestamp, 20),

-- Topic 21: Backup, Restore, and Security Basics
('Backing up databases', NULL, 1, true, current_timestamp, current_timestamp, 21),
('Restoring databases', NULL, 2, true, current_timestamp, current_timestamp, 21),
('User roles and permissions', NULL, 3, true, current_timestamp, current_timestamp, 21),
('Granting and revoking privileges', NULL, 4, true, current_timestamp, current_timestamp, 21),
('Basic security practices', NULL, 5, true, current_timestamp, current_timestamp, 21),

-- Topic 22: Hands-On Projects / Practice
('Create a database for a Library Management System', NULL, 1, true, current_timestamp, current_timestamp, 22),
('Create a database for an Online Store', NULL, 2, true, current_timestamp, current_timestamp, 22),
('Queries for reporting (e.g., total sales, user activity)', NULL, 3, true, current_timestamp, current_timestamp, 22),
('Practice joins and subqueries on sample datasets', NULL, 4, true, current_timestamp, current_timestamp, 22)
ON CONFLICT ("title", "topicId") DO NOTHING;


-- -- Insert ContentBlocks with subtopicId
-- INSERT INTO public."ContentBlocks"
-- (
--     "displayOrder",
--     "dataType",
--     "title",
--     "data",
--     "isActive",
--     "createdAt",
--     "updatedAt",
--     "subtopicId"
-- )
-- VALUES
-- -- YouTube Video
-- (1, 'youtube_video', 'What is Python?', 
-- $$
-- {"videoUrl": "https://www.youtube.com/watch?v=kqtD5dpn9C8"}
-- $$,
-- true, current_timestamp, current_timestamp, 4),

-- -- Notes (Rich HTML)
-- (2, 'notes', 'Introduction to Python', 
-- $$
-- {"description": 
-- "<h1>Welcome to Python</h1>
-- <p>Python is a high-level, interpreted programming language known for its readability and versatility. It is widely used in data science, web development, automation, and AI.</p>
-- <h2>Features of Python</h2>
-- <ul>
--   <li>Easy to read and write</li>
--   <li>Dynamic typing and memory management</li>
--   <li>Huge standard library</li>
--   <li>Open-source and community-driven</li>
--   </ul>
--   <h2>Getting Started</h2><ol>
--   <li>Install Python from <a href='https://python.org'>python.org</a></li><li>Write a simple program using any text editor</li>
--   <li>Run the script using the 
--   <code>python</code> command</li></ol>
--   <h2>Example Code</h2>
--   <pre><code>def greet(name):\n    print(f'Hello, {name}!')\n\ngreet('World')</code></pre><p>Inline code example: use the <code>print()</code> function to display output.</p>"}
-- $$,
-- true, current_timestamp, current_timestamp, 4),

-- -- Notes with code example
-- (3, 'notes', 'Addition of Two Numbers in Python (Notes with code)', 
-- $$
-- {"description": "<h2>Addition Example</h2><p>In Python, you can add numbers easily using the <code>+</code> operator:</p><pre><code>a = 5\nb = 10\nprint(a + b)  # Output: 15</code></pre><p>Python automatically handles integer and float addition.</p>"}
-- $$,
-- true, current_timestamp, current_timestamp, 4),

-- -- MCQ Set
-- (4, 'mcq_set', 'Python Basics Quiz', 
-- $$
-- {"questions": [
--       {"question": "Who developed Python programming language?",
--        "options": ["Dennis Ritchie", "James Gosling", "Guido van Rossum", "Bjarne Stroustrup"],
--        "answer": "Guido van Rossum"},
--       {"question": "Which of the following is used to define a function in Python?",
--        "options": ["func", "define", "def", "function"],
--        "answer": "def"},
--       {"question": "What is the output of print(type([]))?",
--        "options": ["<class 'list'>", "<class 'tuple'>", "<class 'dict'>", "<class 'set'>"],
--        "answer": "<class 'list'>"}
--  ]}
-- $$,
-- true, current_timestamp, current_timestamp, 4)


