const CONTENT = {
 "schema": 1,
 "me": "Sam",
 "socials": [["linkedin", "LinkedIn", "https://www.linkedin.com/"], ["github", "GitHub", "https://github.com/"]],
 "school": {
  "name": "State University",
  "degree": "B.S.",
  "major": "Computer Science",
  "system": "quarter",
  "depts": {"COMPUTER SCIENCE": "CS"}
 },
 "terms": [
  {
   "id": "fall-2026",
   "name": "Fall 2026",
   "year": "Year 2 (2026-27)",
   "start": "2026-09-24",
   "end": "2026-12-12",
   "lastClass": "2026-12-05",
   "classes": [
    {
     "code": "CS 210",
     "title": "Computer Organization",
     "prof": "Rivera",
     "meets": "Lec Mon Wed, Hall 100.",
     "times": [["Lec", [1, 3], "10:00", "11:20", "Hall 100"]]
    },
    {
     "code": "CS 220",
     "title": "Algorithms",
     "prof": "Okafor",
     "meets": "Lec Tue Thu, Science 210.",
     "times": [["Lec", [2, 4], "13:00", "14:20", "Science 210"]]
    },
    {
     "code": "WRIT 101",
     "title": "Technical Writing",
     "prof": "Lindqvist",
     "meets": "Lec Mon Wed Fri, Library 12.",
     "times": [["Lec", [1, 3, 5], "15:00", "15:50", "Library 12"]]
    }
   ]
  },
  {
   "id": "winter-2027",
   "name": "Winter 2027",
   "year": "Year 2 (2026-27)",
   "start": "2027-01-05",
   "end": "2027-03-20",
   "lastClass": "2027-03-13",
   "classes": [
    {"code": "CS 230", "title": "Operating Systems"},
    {"code": "CS 240", "title": "Databases"}
   ]
  }
 ],
 "areas": [
  {"id": "classes", "name": "Classes"},
  {"id": "career", "name": "Internship search"},
  {"id": "life", "name": "Life"}
 ],
 "todo": [
  {"id": "td-a-hw", "a": "classes", "cls": "CS 210", "t": "Homework 5", "due": "2026-11-22", "time": "11:59 PM"},
  {"id": "td-b-quiz", "a": "classes", "cls": "CS 220", "t": "Quiz 3", "due": "2026-11-24"},
  {"id": "td-a-project", "a": "classes", "cls": "CS 210", "t": "Project milestone 2", "due": "2026-11-27", "note": "Design done, tests left"},
  {"id": "td-resume", "a": "career", "t": "Update the resume with the summer project", "due": "2026-11-25"},
  {"id": "td-b-final", "a": "classes", "cls": "CS 220", "t": "Final exam", "due": "2026-12-12", "time": "8:00 AM"},
  {"id": "td-lease", "a": "life", "t": "Renew the apartment lease", "due": "2026-12-03"}
 ],
 "done": [],
 "checkin": "Sunday check-in: note the week's wins and set next week's goal.",
 "kinds": [["internship", "Internship"], ["scholarship", "Scholarship"], ["research", "Research"]],
 "apps": [
  {
   "id": "ap-acme",
   "kind": "internship",
   "org": "Acme Robotics",
   "role": "Software Engineering Intern, summer",
   "loc": "Remote",
   "status": "To start",
   "due": "2026-11-30",
   "next": "Tailor the resume and write two lines on the robot arm project.",
   "url": "https://example.com/"
  },
  {
   "id": "ap-northwind",
   "kind": "internship",
   "org": "Northwind Labs",
   "role": "Backend Intern",
   "loc": "Seattle, WA",
   "status": "Applied",
   "url": "https://example.com/"
  },
  {
   "id": "ap-grant",
   "kind": "scholarship",
   "org": "STEM Futures Scholarship",
   "role": "For second-year students in computing",
   "status": "Deciding",
   "due": "2026-12-11",
   "next": "Ask one professor for a letter.",
   "url": "https://example.com/"
  }
 ],
 "find": [
  {
   "group": "Where to look",
   "items": [
    {"org": "University career site", "what": "Internships posted for this school's students.", "url": "https://example.com/"},
    {"org": "Company career pages", "what": "Apply directly; most open in early fall.", "url": "https://example.com/"}
   ]
  }
 ],
 "months": [
  {
   "key": "2026-11",
   "short": "Nov",
   "name": "November 2026",
   "focus": "Classes and two applications",
   "theme": "The term is full, so the extras stay small."
  },
  {
   "key": "2026-12",
   "short": "Dec",
   "name": "December 2026",
   "focus": "Finish the weather dashboard",
   "theme": "The break is the time for the personal project."
  },
  {
   "key": "2027-01",
   "short": "Jan",
   "name": "January 2027",
   "focus": "Start the certification",
   "theme": "A lighter month: one certification and interview practice."
  }
 ],
 "weeks": [
  {
   "id": "w-2026-11-16",
   "start": "2026-11-16",
   "goal": "Two applications out",
   "cert": null,
   "tag": null,
   "hrs": "~3 hrs",
   "steps": [
    {"id": "w-2026-11-16-a", "t": "Apply to Acme Robotics and add it to Applications."},
    {"id": "w-2026-11-16-b", "t": "Ask one professor for a reference."},
    {"id": "w-2026-11-16-c", "t": "Write the README for the weather dashboard."}
   ],
   "sun": "w-2026-11-16-sun"
  },
  {
   "id": "w-2026-11-23",
   "start": "2026-11-23",
   "goal": "Project milestone and review",
   "cert": null,
   "tag": null,
   "hrs": "~3 hrs",
   "steps": [
    {"id": "w-2026-11-23-a", "t": "Finish the CS 210 project milestone."},
    {"id": "w-2026-11-23-b", "t": "Do three interview practice problems."}
   ],
   "sun": "w-2026-11-23-sun"
  },
  {
   "id": "w-2026-11-30",
   "start": "2026-11-30",
   "goal": "Finals prep",
   "cert": null,
   "tag": null,
   "hrs": "~3 hrs",
   "steps": [
    {"id": "w-2026-11-30-a", "t": "Make a study guide for each final."},
    {"id": "w-2026-11-30-b", "t": "Book a mock interview at the career center."}
   ],
   "sun": "w-2026-11-30-sun"
  },
  {
   "id": "w-2026-12-07",
   "start": "2026-12-07",
   "goal": "Rest, then the dashboard",
   "cert": null,
   "tag": null,
   "hrs": "~3 hrs",
   "steps": [
    {"id": "w-2026-12-07-a", "t": "Deploy the weather dashboard."},
    {"id": "w-2026-12-07-b", "t": "Write its portfolio page."}
   ],
   "sun": "w-2026-12-07-sun"
  }
 ],
 "works": [
  {
   "id": "wk-weather",
   "kind": "personal",
   "title": "Weather station dashboard",
   "start": "2026-09-07",
   "when": "Since Sep 2026",
   "status": "active",
   "plan": "p-weather",
   "summary": "A small weather station on a microcontroller that posts readings to a web dashboard.",
   "stack": ["Python", "PostgreSQL", "JavaScript"],
   "bullets": [
    "Collects temperature and humidity every minute and stores a month of readings.",
    "Dashboard charts load in under a second from a single indexed query."
   ],
   "targets": ["t-python", "t-sql"],
   "github": "https://github.com/"
  },
  {
   "id": "wk-tutor",
   "kind": "work",
   "title": "Peer tutor for intro programming",
   "org": "State University",
   "role": "Tutor",
   "start": "2025-10-17",
   "when": "Last year",
   "status": "done",
   "exp": true,
   "summary": "Weekly drop-in tutoring for the first programming course.",
   "stack": ["Python"],
   "bullets": ["Helped about 40 students debug their first programs."],
   "targets": ["t-team"]
  }
 ],
 "projects": [
  {
   "id": "p-weather",
   "monthName": "This term",
   "kind": "Personal",
   "title": "Weather station dashboard",
   "skill": "Python, SQL, a deployed web app",
   "why": "It is a complete system, from sensor to screen, and it is small enough to finish.",
   "steps": ["Add a week view to the charts.", "Deploy it and write the README.", "Measure load time before and after the index."],
   "portfolio": "A page with the system diagram, one chart and the load-time numbers.",
   "targets": ["t-python", "t-sql"]
  },
  {
   "id": "p-shell",
   "monthName": "Next term",
   "kind": "Class",
   "title": "A Unix shell in C",
   "skill": "C, processes, debugging",
   "why": "Operating systems postings ask for C close to the machine, and CS 230 assigns exactly this.",
   "steps": ["Keep notes on the hardest bug.", "Write the page once the course ends: design only, no code."],
   "portfolio": "A write-up of the design and one bug, without the code.",
   "targets": ["t-c", "t-debug"]
  },
  {
   "id": "p-oss",
   "monthName": "Summer",
   "kind": "Personal",
   "title": "A first open-source contribution",
   "skill": "Reading a large codebase, code review",
   "why": "Shows the ability to work in someone else's code.",
   "steps": ["Pick a project already in use.", "Fix one documented beginner issue."],
   "portfolio": "A short page linking the merged change.",
   "idea": true,
   "targets": ["t-git", "t-team"]
  }
 ],
 "targets": [
  {
   "id": "t-python",
   "name": "Python",
   "freq": "most",
   "count": "5 of 6 postings",
   "how": "The weather dashboard and CS 101 and 102.",
   "go": "projects",
   "btn": "See projects"
  },
  {"id": "t-c", "name": "C or C++", "freq": "many", "count": "4 of 6", "how": "CS 210 and the shell in CS 230.", "go": "plan", "btn": "See the plan"},
  {
   "id": "t-sql",
   "name": "SQL and databases",
   "freq": "many",
   "count": "3 of 6",
   "how": "The dashboard's database, then CS 240.",
   "go": "projects",
   "btn": "See projects"
  },
  {
   "id": "t-git",
   "name": "Git and code review",
   "freq": "some",
   "count": "2 of 6",
   "how": "Every project is on GitHub; the certification covers the rest.",
   "go": "certs",
   "btn": "See certifications"
  },
  {
   "id": "t-debug",
   "name": "Debugging",
   "freq": "some",
   "count": "2 of 6",
   "how": "The shell project, with notes on one hard bug.",
   "go": "projects",
   "btn": "See projects"
  },
  {
   "id": "t-team",
   "name": "Communication and teamwork",
   "freq": "most",
   "count": "5 of 6",
   "how": "Tutoring, and the team project in CS 260.",
   "go": "projects",
   "btn": "See projects",
   "soft": true
  }
 ],
 "postings": [
  {"company": "Acme Robotics", "title": "Software Engineering Intern", "url": "https://example.com/"},
  {"company": "Northwind Labs", "title": "Backend Intern", "url": "https://example.com/"},
  {"company": "Globex", "title": "Systems Intern", "url": "https://example.com/"}
 ],
 "tracks": [
  {"id": "tools", "name": "Tools"},
  {"id": "cloud", "name": "Cloud"}
 ],
 "certs": [
  {
   "id": "c-git",
   "short": "GitHub Foundations",
   "track": "tools",
   "month": "January 2027",
   "name": "GitHub Foundations",
   "what": "A proctored exam on Git and GitHub.",
   "why": "Git shows up in a third of the postings and this is quick to earn.",
   "cost": "About $99",
   "time": "100 min exam, about 10 hrs prep",
   "format": "Online proctored exam",
   "prep": ["Work through the free learning path.", "Practice branches and pull requests on a personal repo."],
   "url": "https://example.com/"
  },
  {
   "id": "c-cloud",
   "short": "Cloud Practitioner",
   "track": "cloud",
   "month": "Summer",
   "name": "Cloud Practitioner",
   "what": "An entry-level cloud exam.",
   "why": "A base for deploying projects.",
   "cost": "About $100",
   "time": "90 min exam, about 20 hrs prep",
   "format": "Online or test center",
   "prep": ["Take the free course.", "Deploy the dashboard to a free tier."],
   "url": "https://example.com/"
  }
 ],
 "costnote": "Total for both: about $200. Check for student discounts first.",
 "portfolio": {
  "setup": [
   {"id": "pf-site", "t": "Pick where the portfolio lives", "d": "A personal site or a pinned GitHub repo is enough."},
   {"id": "pf-first", "t": "Write the first project page", "d": "The weather dashboard: problem, design, result."}
  ],
  "where": [["Notes", "the working notes and the write-up for every project"], ["This site", "tracking: status, stack and what is planned"]],
  "kinds": [
   ["Personal", "everything can be public, including the code"],
   ["Class", "write-up only, never code"],
   ["Work", "only what the employer has agreed to"]
  ],
  "parts": [
   ["Problem", "one or two sentences on the goal"],
   ["Design", "a diagram and the key decisions"],
   ["Result", "numbers, and what would change next time"]
  ],
  "sunday": ["Turn the month's notes into updates to each project page.", "Publish one page that is ready."]
 },
 "start": [
  {
   "group": "Accounts",
   "eyebrow": "Week 1",
   "items": [
    {"id": "s-github", "t": "Clean up the GitHub profile", "d": "Pin the best two repositories and add a one-line bio."},
    {"id": "s-linkedin", "t": "Fill in the LinkedIn profile", "d": "School, major, graduation year and the current project."}
   ]
  }
 ],
 "study": [
  {"id": "sg-sample-midterm", "cls": "CS 210", "title": "Midterm: the first half of the course", "made": "2026-11-11", "url": "https://example.com/"}
 ],
 "later": {
  "years": [
   {
    "year": "Year 1 (2025-26)",
    "quarters": [
     {
      "q": "Fall 2025",
      "courses": [
       {
        "code": "CS 101",
        "title": "Introduction to Programming",
        "value": "Low",
        "desc": "The first programming course, in Python.",
        "project": "Small programs: a text game, a file organizer.",
        "learn": "Variables, loops, functions and reading other people's code.",
        "pre": [],
        "note": null
       },
       {
        "code": "MATH 120",
        "title": "Calculus I",
        "value": "Low",
        "desc": "Limits, derivatives and integrals.",
        "project": "Problem sets and exams.",
        "learn": "How quantities change, which later courses lean on.",
        "pre": [],
        "note": null
       }
      ]
     },
     {
      "q": "Winter 2026",
      "courses": [
       {
        "code": "CS 102",
        "title": "Programming II",
        "value": "Low",
        "desc": "Larger programs and object-oriented design.",
        "project": "A multi-file project with tests.",
        "learn": "Classes, testing and breaking a problem into parts.",
        "pre": ["CS 101"],
        "note": null
       },
       {
        "code": "MATH 121",
        "title": "Calculus II",
        "value": "Low",
        "desc": "Series and techniques of integration.",
        "project": "Problem sets and exams.",
        "learn": "The math behind algorithm analysis and probability.",
        "pre": ["MATH 120"],
        "note": null
       }
      ]
     },
     {
      "q": "Spring 2026",
      "courses": [
       {
        "code": "CS 201",
        "title": "Data Structures",
        "value": "High",
        "desc": "Lists, trees, hash tables and graphs, and what each one costs.",
        "project": "Hand-built versions of the standard data structures.",
        "learn": "Picking a data structure by how it behaves as data grows.",
        "pre": ["CS 102"],
        "note": null
       },
       {
        "code": "STAT 200",
        "title": "Statistics",
        "value": "Low",
        "desc": "Probability and statistics for scientists.",
        "project": "Problem sets and a small data analysis.",
        "learn": "Reading data honestly and reasoning about chance.",
        "pre": ["MATH 121"],
        "note": null
       }
      ]
     }
    ]
   },
   {
    "year": "Year 2 (2026-27)",
    "quarters": [
     {
      "q": "Fall 2026",
      "courses": [
       {
        "code": "CS 210",
        "title": "Computer Organization",
        "value": "Medium",
        "desc": "How a program runs on a real machine.",
        "project": "Assembly programs and a small simulator.",
        "learn": "Memory, the processor and what compiled code looks like.",
        "pre": ["CS 102"],
        "note": null
       },
       {
        "code": "CS 220",
        "title": "Algorithms",
        "value": "High",
        "desc": "Designing fast algorithms and proving they work.",
        "project": "Problem sets and timed implementations.",
        "learn": "Sorting, graphs, dynamic programming and big-O analysis.",
        "pre": ["CS 201"],
        "note": null
       },
       {
        "code": "WRIT 101",
        "title": "Technical Writing",
        "value": "Low",
        "desc": "Writing clearly about technical work.",
        "project": "A report and a short talk.",
        "learn": "Explaining a design to people who did not build it.",
        "pre": [],
        "note": null
       }
      ]
     },
     {
      "q": "Winter 2027",
      "courses": [
       {
        "code": "CS 230",
        "title": "Operating Systems",
        "value": "High",
        "desc": "Processes, memory and files.",
        "project": "A shell and a memory allocator in C.",
        "learn": "What the operating system does under every program.",
        "pre": ["CS 210"],
        "note": null
       },
       {
        "code": "CS 240",
        "title": "Databases",
        "value": "Medium",
        "desc": "Storing and querying data.",
        "project": "A web app backed by a database.",
        "learn": "SQL, indexes and designing tables.",
        "pre": ["CS 201"],
        "note": null
       }
      ]
     },
     {
      "q": "Spring 2027",
      "courses": [
       {
        "code": "CS 250",
        "title": "Computer Networks",
        "value": "Medium",
        "desc": "How machines talk to each other.",
        "project": "A small web server and a chat protocol.",
        "learn": "Sockets, TCP/IP and what happens when a page loads.",
        "pre": ["CS 230"],
        "note": null
       },
       {
        "code": "CS 260",
        "title": "Software Engineering",
        "value": "High",
        "desc": "Building software in a team.",
        "project": "A term-long team project with code review.",
        "learn": "Version control, testing and working from requirements.",
        "pre": ["CS 220"],
        "note": null
       }
      ]
     }
    ]
   }
  ],
  "sources": "A made-up plan for the sample.",
  "summary": [
   "A general computer science degree with a lean toward systems: organization, operating systems and networks in the second year, with databases and a team project alongside."
  ],
  "threads": [
   {
    "name": "Systems",
    "chain": ["CS 102", "CS 210", "CS 230", "CS 250"],
    "about": "How a program runs on a machine, from memory up to the network.",
    "good": "Each class here produces a project in C.",
    "watch": "CS 230 is the heaviest class in the plan."
   }
  ],
  "watch": [
   {"when": "Year 2", "t": "Two project classes at once", "d": "CS 230 and CS 240 both have large projects. Start each one in the first week."}
  ]
 },
 "credit": ["MATH 120"],
 "reqs": {
  "note": "A made-up set of requirements for the sample. A real site copies these from the degree audit.",
  "groups": [
   {
    "name": "Lower-division",
    "rows": [
     {"name": "Programming", "all": ["CS 101", "CS 102", "CS 201"]},
     {"name": "Math", "all": ["MATH 120", "MATH 121"]},
     {"name": "Statistics or writing", "need": 1, "from": ["STAT 200", "WRIT 101"]}
    ]
   },
   {
    "name": "Upper-division",
    "rows": [
     {"name": "Core", "all": ["CS 210", "CS 220"]},
     {"name": "Electives", "need": 3, "electives": true, "hint": "Any CS course numbered 230 or above.", "from": [], "ranges": [["CS", 230, 299]]}
    ]
   }
  ]
 }
};
