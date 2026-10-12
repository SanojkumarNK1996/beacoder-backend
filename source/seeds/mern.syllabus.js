const db = require('../config/db');
const Courses = require('../models/Courses.model');
const CourseTopics = require('../models/CourseTopics.model');
const Subtopics = require('../models/Subtopics.model');
const ContentBlocks = require('../models/ContentTable.model');

/* =====================================================
   HELPER: CREATE SUBTOPICS + CONTENT BLOCKS
===================================================== */
async function createSubtopicsWithContent({
  topicId,
  subtopics,
  transaction,
}) {
  for (let i = 0; i < subtopics.length; i++) {
    const subtopic = await Subtopics.create(
      {
        title: subtopics[i].title,
        topicId,
        displayOrder: i + 1,
      },
      { transaction }
    );

    for (let j = 0; j < subtopics[i].contents.length; j++) {
      await ContentBlocks.create(
        {
          subtopicId: subtopic.id,
          displayOrder: j + 1,
          dataType: subtopics[i].contents[j].type,
          title: subtopics[i].contents[j].title,
          data: subtopics[i].contents[j].data,
        },
        { transaction }
      );
    }
  }
}

/* =====================================================
   DATA DEFINITIONS
===================================================== */
const BASIC_JAVASCRIPT = [
  {
    title: 'What is Programming?',
    contents: [
      {
        type: 'notes',
        title: 'What is Programming?',
        data: {
          html: `
            <h1>What is Programming?</h1>
            <p>
              Programming is the process of writing instructions
              that computers can execute to solve problems.
            </p>
          `,
        },
      },
    ],
  },
  {
    title: 'What is JavaScript?',
    contents: [
      {
        type: 'notes',
        title: 'What is JavaScript?',
        data: {
          html: `
            <h1>What is JavaScript?</h1>
            <p>
              JavaScript is a high-level programming language
              used to create interactive web applications.
            </p>
          `,
        },
      },
    ],
  },
  {
    title: 'Introduction to HTML',
    contents: [
      {
        type: 'notes',
        title: 'Introduction to HTML',
        data: {
          html: `
            <h1>Introduction to HTML</h1>
            <p>
              HTML defines the structure and layout of web pages.
            </p>
          `,
        },
      },
    ],
  },
];

const ADVANCED_JAVASCRIPT = [
  {
    title: 'Closures in JavaScript',
    contents: [
      {
        type: 'notes',
        title: 'Closures in JavaScript',
        data: {
          html: `
            <h1>Closures in JavaScript</h1>
            <p>
              A closure allows a function to access variables
              from its outer scope even after execution.
            </p>
            <pre>
function outer() {
  let count = 0;
  return function inner() {
    count++;
    return count;
  }
}
            </pre>
          `,
        },
      },
    ],
  },
  {
    title: 'Event Loop & Async JavaScript',
    contents: [
      {
        type: 'notes',
        title: 'Event Loop & Async JavaScript',
        data: {
          html: `
            <h1>Event Loop & Async JavaScript</h1>
            <p>
              The event loop enables JavaScript to handle
              asynchronous operations efficiently.
            </p>
            <ul>
              <li>Call Stack</li>
              <li>Web APIs</li>
              <li>Microtask Queue</li>
              <li>Callback Queue</li>
            </ul>
          `,
        },
      },
    ],
  },
];

/* =====================================================
   MAIN EXECUTION
===================================================== */
(async () => {
  const transaction = await db.pgConn.transaction();

  try {
    /* -----------------------------
       CREATE COURSE
    ----------------------------- */
    const course = await Courses.create(
      {
        courseKey: 'mern',
        courseName: 'MERN Stack',
        description: 'Complete MERN Stack Development Course',
        difficultyLevel: 'medium',
        estimatedHours: 120,
      },
      { transaction }
    );

    /* -----------------------------
       CREATE TOPICS
    ----------------------------- */
    const topicTitles = [
      'Basic JavaScript',
      'Advanced JavaScript',
      'React',
      'Redux',
      'Express',
      'MongoDB',
    ];

    const createdTopics = {};

    for (let i = 0; i < topicTitles.length; i++) {
      const topic = await CourseTopics.create(
        {
          title: topicTitles[i],
          courseId: course.id,
          displayOrder: i + 1,
        },
        { transaction }
      );

      createdTopics[topicTitles[i]] = topic;
    }

    /* -----------------------------
       INSERT BASIC JAVASCRIPT
    ----------------------------- */
    await createSubtopicsWithContent({
      topicId: createdTopics['Basic JavaScript'].id,
      subtopics: BASIC_JAVASCRIPT,
      transaction,
    });

    /* -----------------------------
       INSERT ADVANCED JAVASCRIPT
    ----------------------------- */
    await createSubtopicsWithContent({
      topicId: createdTopics['Advanced JavaScript'].id,
      subtopics: ADVANCED_JAVASCRIPT,
      transaction,
    });

    /* -----------------------------
       COMMIT
    ----------------------------- */
    await transaction.commit();
    console.log('✅ MERN syllabus seeded successfully');
    process.exit(0);

  } catch (error) {
    await transaction.rollback();
    console.error('❌ MERN syllabus seeding failed:', error);
    process.exit(1);
  }
})();
