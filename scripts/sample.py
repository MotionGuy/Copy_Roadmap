#!/usr/bin/env python3
"""Write content/sample.js: a made-up student's content, dated around today.

Usage:  python3 scripts/sample.py              (a school on quarters)
        python3 scripts/sample.py --semester   (a school on semesters)

The sample is for trying the site out, for screenshots and for the test scripts (check.py and smoke.py use it when
there is no content/content.js). The site itself never loads it. To see it in the browser, copy it over content.js:
    cp content/sample.js content/content.js
"""
import argparse, datetime as dt, pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import content

ap = argparse.ArgumentParser(); ap.add_argument("--semester", action="store_true"); ap.add_argument("--out", default=str(content.ROOT / "content" / "sample.js"))
args = ap.parse_args()
SEM = args.semester
today = dt.date.today()
iso = lambda d: d.isoformat()
day = lambda n: iso(today + dt.timedelta(days=n))

# The school year today falls in, and its terms. A date between terms belongs to the next one.
Y = today.year if today.month >= 8 else today.year - 1
def terms_of(y):
    if SEM: return [("Fall", dt.date(y, 8, 24), dt.date(y, 12, 15)), ("Spring", dt.date(y + 1, 1, 12), dt.date(y + 1, 5, 12))]
    return [("Fall", dt.date(y, 9, 24), dt.date(y, 12, 12)), ("Winter", dt.date(y + 1, 1, 5), dt.date(y + 1, 3, 20)), ("Spring", dt.date(y + 1, 3, 30), dt.date(y + 1, 6, 12))]
tname = lambda t: f"{t[0]} {t[1].year}"
this_year = terms_of(Y)
now = next((t for t in this_year if today <= t[2]), this_year[-1])

C = lambda code, title, desc, project, learn, pre=(), value="Medium": {"code": code, "title": title, "value": value, "desc": desc, "project": project, "learn": learn, "pre": list(pre), "note": None}
COURSES = [
    C("CS 101", "Introduction to Programming", "The first programming course, in Python.", "Small programs: a text game, a file organizer.", "Variables, loops, functions and reading other people's code.", value="Low"),
    C("MATH 120", "Calculus I", "Limits, derivatives and integrals.", "Problem sets and exams.", "How quantities change, which later courses lean on.", value="Low"),
    C("CS 102", "Programming II", "Larger programs and object-oriented design.", "A multi-file project with tests.", "Classes, testing and breaking a problem into parts.", ["CS 101"], "Low"),
    C("MATH 121", "Calculus II", "Series and techniques of integration.", "Problem sets and exams.", "The math behind algorithm analysis and probability.", ["MATH 120"], "Low"),
    C("CS 201", "Data Structures", "Lists, trees, hash tables and graphs, and what each one costs.", "Hand-built versions of the standard data structures.", "Picking a data structure by how it behaves as data grows.", ["CS 102"], "High"),
    C("STAT 200", "Statistics", "Probability and statistics for scientists.", "Problem sets and a small data analysis.", "Reading data honestly and reasoning about chance.", ["MATH 121"], "Low"),
    C("CS 210", "Computer Organization", "How a program runs on a real machine.", "Assembly programs and a small simulator.", "Memory, the processor and what compiled code looks like.", ["CS 102"]),
    C("CS 220", "Algorithms", "Designing fast algorithms and proving they work.", "Problem sets and timed implementations.", "Sorting, graphs, dynamic programming and big-O analysis.", ["CS 201"], "High"),
    C("WRIT 101", "Technical Writing", "Writing clearly about technical work.", "A report and a short talk.", "Explaining a design to people who did not build it.", value="Low"),
    C("CS 230", "Operating Systems", "Processes, memory and files.", "A shell and a memory allocator in C.", "What the operating system does under every program.", ["CS 210"], "High"),
    C("CS 240", "Databases", "Storing and querying data.", "A web app backed by a database.", "SQL, indexes and designing tables.", ["CS 201"]),
    C("CS 250", "Computer Networks", "How machines talk to each other.", "A small web server and a chat protocol.", "Sockets, TCP/IP and what happens when a page loads.", ["CS 230"]),
    C("CS 260", "Software Engineering", "Building software in a team.", "A term-long team project with code review.", "Version control, testing and working from requirements.", ["CS 220"], "High"),
]
by = {c["code"]: c for c in COURSES}
if SEM: plan = [[["CS 101", "MATH 120", "WRIT 101"], ["CS 102", "MATH 121", "CS 201"]], [["CS 210", "CS 220", "STAT 200"], ["CS 230", "CS 240", "CS 260"]]]
else:   plan = [[["CS 101", "MATH 120"], ["CS 102", "MATH 121"], ["CS 201", "STAT 200"]], [["CS 210", "CS 220", "WRIT 101"], ["CS 230", "CS 240"], ["CS 250", "CS 260"]]]
years = []
for n, y in enumerate([Y - 1, Y]):
    years.append({"year": f"Year {n + 1} ({y}-{str(y + 1)[2:]})", "quarters": [{"q": tname(t), "courses": [by[c] for c in codes]} for t, codes in zip(terms_of(y), plan[n])]})
now_codes = plan[1][this_year.index(now)]
slots = [("Mon Wed", [1, 3], "10:00", "11:20", "Hall 100"), ("Tue Thu", [2, 4], "13:00", "14:20", "Science 210"), ("Mon Wed Fri", [1, 3, 5], "15:00", "15:50", "Library 12")]
classes = [{"code": c, "title": by[c]["title"], "prof": ["Rivera", "Okafor", "Lindqvist"][i], "meets": f"Lec {s[0]}, {s[4]}.", "times": [["Lec", s[1], s[2], s[3], s[4]]]} for i, (c, s) in enumerate(zip(now_codes, slots))]
last_class = now[2] - dt.timedelta(days=7)
term = {"id": tname(now).lower().replace(" ", "-"), "name": tname(now), "year": years[1]["year"], "start": iso(now[1]), "end": iso(now[2]), "lastClass": iso(last_class), "classes": classes}
# one more term of the same year, so the calendar and the plan have two to move between
i_now = this_year.index(now); other = this_year[i_now + 1] if i_now == 0 else this_year[i_now - 1]
other_term = {"id": tname(other).lower().replace(" ", "-"), "name": tname(other), "year": years[1]["year"], "start": iso(other[1]), "end": iso(other[2]), "lastClass": iso(other[2] - dt.timedelta(days=7)),
              "classes": [{"code": c, "title": by[c]["title"]} for c in plan[1][this_year.index(other)]]}
all_terms = sorted([term, other_term], key=lambda t: t["start"])

monday = today - dt.timedelta(days=today.weekday())
def week(n, goal, steps):
    m = monday + dt.timedelta(days=7 * n); wid = "w-" + iso(m)
    return {"id": wid, "start": iso(m), "goal": goal, "cert": None, "tag": None, "hrs": "~3 hrs", "steps": [{"id": f"{wid}-{chr(97 + i)}", "t": t} for i, t in enumerate(steps)], "sun": wid + "-sun"}
def month(n, focus, theme):
    d = dt.date(today.year + (today.month - 1 + n) // 12, (today.month - 1 + n) % 12 + 1, 1)
    return {"key": d.strftime("%Y-%m"), "short": d.strftime("%b"), "name": d.strftime("%B %Y"), "focus": focus, "theme": theme}
a, b = now_codes[0], now_codes[1]

data = {
    "schema": 1,
    "me": "Sam",
    "socials": [["linkedin", "LinkedIn", "https://www.linkedin.com/"], ["github", "GitHub", "https://github.com/"]],
    "school": {"name": "State University", "degree": "B.S.", "major": "Computer Science", "system": "semester" if SEM else "quarter", "depts": {"COMPUTER SCIENCE": "CS"}},
    "terms": all_terms,
    "areas": [{"id": "classes", "name": "Classes"}, {"id": "career", "name": "Internship search"}, {"id": "life", "name": "Life"}],
    "todo": [
        {"id": "td-a-hw", "a": "classes", "cls": a, "t": "Homework 5", "due": day(1), "time": "11:59 PM"},
        {"id": "td-b-quiz", "a": "classes", "cls": b, "t": "Quiz 3", "due": day(3)},
        {"id": "td-a-project", "a": "classes", "cls": a, "t": "Project milestone 2", "due": day(6), "note": "Design done, tests left"},
        {"id": "td-resume", "a": "career", "t": "Update the resume with the summer project", "due": day(4)},
        {"id": "td-b-final", "a": "classes", "cls": b, "t": "Final exam", "due": iso(now[2]), "time": "8:00 AM"},
        {"id": "td-lease", "a": "life", "t": "Renew the apartment lease", "due": day(12)},
    ],
    "done": [],
    "checkin": "Sunday check-in: note the week's wins and set next week's goal.",
    "kinds": [["internship", "Internship"], ["scholarship", "Scholarship"], ["research", "Research"]],
    "apps": [
        {"id": "ap-acme", "kind": "internship", "org": "Acme Robotics", "role": "Software Engineering Intern, summer", "loc": "Remote", "status": "To start", "due": day(9), "next": "Tailor the resume and write two lines on the robot arm project.", "url": "https://example.com/"},
        {"id": "ap-northwind", "kind": "internship", "org": "Northwind Labs", "role": "Backend Intern", "loc": "Seattle, WA", "status": "Applied", "url": "https://example.com/"},
        {"id": "ap-grant", "kind": "scholarship", "org": "STEM Futures Scholarship", "role": "For second-year students in computing", "status": "Deciding", "due": day(20), "next": "Ask one professor for a letter.", "url": "https://example.com/"},
    ],
    "find": [{"group": "Where to look", "items": [{"org": "University career site", "what": "Internships posted for this school's students.", "url": "https://example.com/"}, {"org": "Company career pages", "what": "Apply directly; most open in early fall.", "url": "https://example.com/"}]}],
    "months": [month(0, "Classes and two applications", "The term is full, so the extras stay small."), month(1, "Finish the weather dashboard", "The break is the time for the personal project."), month(2, "Start the certification", "A lighter month: one certification and interview practice.")],
    "weeks": [
        week(0, "Two applications out", ["Apply to Acme Robotics and add it to Applications.", "Ask one professor for a reference.", "Write the README for the weather dashboard."]),
        week(1, "Project milestone and review", [f"Finish the {a} project milestone.", "Do three interview practice problems."]),
        week(2, "Finals prep", ["Make a study guide for each final.", "Book a mock interview at the career center."]),
        week(3, "Rest, then the dashboard", ["Deploy the weather dashboard.", "Write its portfolio page."]),
    ],
    "works": [
        {"id": "wk-weather", "kind": "personal", "title": "Weather station dashboard", "start": iso(today - dt.timedelta(days=75)), "when": "Since " + (today - dt.timedelta(days=75)).strftime("%b %Y"), "status": "active", "plan": "p-weather",
         "summary": "A small weather station on a microcontroller that posts readings to a web dashboard.", "stack": ["Python", "PostgreSQL", "JavaScript"],
         "bullets": ["Collects temperature and humidity every minute and stores a month of readings.", "Dashboard charts load in under a second from a single indexed query."], "targets": ["t-python", "t-sql"], "github": "https://github.com/"},
        {"id": "wk-tutor", "kind": "work", "title": "Peer tutor for intro programming", "org": "State University", "role": "Tutor", "start": iso(today - dt.timedelta(days=400)), "when": "Last year", "status": "done", "exp": True,
         "summary": "Weekly drop-in tutoring for the first programming course.", "stack": ["Python"], "bullets": ["Helped about 40 students debug their first programs."], "targets": ["t-team"]},
    ],
    "projects": [
        {"id": "p-weather", "monthName": "This term", "kind": "Personal", "title": "Weather station dashboard", "skill": "Python, SQL, a deployed web app", "why": "It is a complete system, from sensor to screen, and it is small enough to finish.", "steps": ["Add a week view to the charts.", "Deploy it and write the README.", "Measure load time before and after the index."], "portfolio": "A page with the system diagram, one chart and the load-time numbers.", "targets": ["t-python", "t-sql"]},
        {"id": "p-shell", "monthName": "Next term", "kind": "Class", "title": "A Unix shell in C", "skill": "C, processes, debugging", "why": "Operating systems postings ask for C close to the machine, and CS 230 assigns exactly this.", "steps": ["Keep notes on the hardest bug.", "Write the page once the course ends: design only, no code."], "portfolio": "A write-up of the design and one bug, without the code.", "targets": ["t-c", "t-debug"]},
        {"id": "p-oss", "monthName": "Summer", "kind": "Personal", "title": "A first open-source contribution", "skill": "Reading a large codebase, code review", "why": "Shows the ability to work in someone else's code.", "steps": ["Pick a project already in use.", "Fix one documented beginner issue."], "portfolio": "A short page linking the merged change.", "idea": True, "targets": ["t-git", "t-team"]},
    ],
    "targets": [
        {"id": "t-python", "name": "Python", "freq": "most", "count": "5 of 6 postings", "how": "The weather dashboard and CS 101 and 102.", "go": "projects", "btn": "See projects"},
        {"id": "t-c", "name": "C or C++", "freq": "many", "count": "4 of 6", "how": "CS 210 and the shell in CS 230.", "go": "plan", "btn": "See the plan"},
        {"id": "t-sql", "name": "SQL and databases", "freq": "many", "count": "3 of 6", "how": "The dashboard's database, then CS 240.", "go": "projects", "btn": "See projects"},
        {"id": "t-git", "name": "Git and code review", "freq": "some", "count": "2 of 6", "how": "Every project is on GitHub; the certification covers the rest.", "go": "certs", "btn": "See certifications"},
        {"id": "t-debug", "name": "Debugging", "freq": "some", "count": "2 of 6", "how": "The shell project, with notes on one hard bug.", "go": "projects", "btn": "See projects"},
        {"id": "t-team", "name": "Communication and teamwork", "freq": "most", "count": "5 of 6", "how": "Tutoring, and the team project in CS 260.", "go": "projects", "btn": "See projects", "soft": True},
    ],
    "postings": [{"company": "Acme Robotics", "title": "Software Engineering Intern", "url": "https://example.com/"}, {"company": "Northwind Labs", "title": "Backend Intern", "url": "https://example.com/"}, {"company": "Globex", "title": "Systems Intern", "url": "https://example.com/"}],
    "tracks": [{"id": "tools", "name": "Tools"}, {"id": "cloud", "name": "Cloud"}],
    "certs": [
        {"id": "c-git", "short": "GitHub Foundations", "track": "tools", "month": month(2, "", "")["name"], "name": "GitHub Foundations", "what": "A proctored exam on Git and GitHub.", "why": "Git shows up in a third of the postings and this is quick to earn.", "cost": "About $99", "time": "100 min exam, about 10 hrs prep", "format": "Online proctored exam", "prep": ["Work through the free learning path.", "Practice branches and pull requests on a personal repo."], "url": "https://example.com/"},
        {"id": "c-cloud", "short": "Cloud Practitioner", "track": "cloud", "month": "Summer", "name": "Cloud Practitioner", "what": "An entry-level cloud exam.", "why": "A base for deploying projects.", "cost": "About $100", "time": "90 min exam, about 20 hrs prep", "format": "Online or test center", "prep": ["Take the free course.", "Deploy the dashboard to a free tier."], "url": "https://example.com/"},
    ],
    "costnote": "Total for both: about $200. Check for student discounts first.",
    "portfolio": {
        "setup": [{"id": "pf-site", "t": "Pick where the portfolio lives", "d": "A personal site or a pinned GitHub repo is enough."}, {"id": "pf-first", "t": "Write the first project page", "d": "The weather dashboard: problem, design, result."}],
        "where": [["Notes", "the working notes and the write-up for every project"], ["This site", "tracking: status, stack and what is planned"]],
        "kinds": [["Personal", "everything can be public, including the code"], ["Class", "write-up only, never code"], ["Work", "only what the employer has agreed to"]],
        "parts": [["Problem", "one or two sentences on the goal"], ["Design", "a diagram and the key decisions"], ["Result", "numbers, and what would change next time"]],
        "sunday": ["Turn the month's notes into updates to each project page.", "Publish one page that is ready."],
    },
    "start": [{"group": "Accounts", "eyebrow": "Week 1", "items": [{"id": "s-github", "t": "Clean up the GitHub profile", "d": "Pin the best two repositories and add a one-line bio."}, {"id": "s-linkedin", "t": "Fill in the LinkedIn profile", "d": "School, major, graduation year and the current project."}]}],
    "study": [{"id": "sg-sample-midterm", "cls": a, "title": "Midterm: the first half of the course", "made": day(-10), "url": "https://example.com/"}],
    "later": {
        "years": years, "sources": "A made-up plan for the sample.",
        "summary": ["A general computer science degree with a lean toward systems: organization, operating systems and networks in the second year, with databases and a team project alongside."],
        "threads": [{"name": "Systems", "chain": ["CS 102", "CS 210", "CS 230"] + ([] if SEM else ["CS 250"]), "about": "How a program runs on a machine, from memory up to the network.", "good": "Each class here produces a project in C.", "watch": "CS 230 is the heaviest class in the plan."}],
        "watch": [{"when": "Year 2", "t": "Two project classes at once", "d": "CS 230 and CS 240 both have large projects. Start each one in the first week."}],
    },
    "credit": ["MATH 120"],
    "reqs": {"note": "A made-up set of requirements for the sample. A real site copies these from the degree audit.", "groups": [
        {"name": "Lower-division", "rows": [{"name": "Programming", "all": ["CS 101", "CS 102", "CS 201"]}, {"name": "Math", "all": ["MATH 120", "MATH 121"]}, {"name": "Statistics or writing", "need": 1, "from": ["STAT 200", "WRIT 101"]}]},
        {"name": "Upper-division", "rows": [{"name": "Core", "all": ["CS 210", "CS 220"]}, {"name": "Electives", "need": 3, "electives": True, "hint": "Any CS course numbered 230 or above.", "from": [], "ranges": [["CS", 230, 299]]}]},
    ]},
}
content.save(data, args.out)
print("wrote", args.out)
