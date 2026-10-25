# Course Reflection

The most challenging topic I encountered during this course was working through asynchronous JavaScript execution and handling promises. Early on, debugging issues where API requests returned unresolved pending promises rather than expected data was confusing. What helped bridge the gap was treating promises as contractual commitments for future data and recognizing that async/await pauses only the local function's execution while the main event loop continues unaffected. Rebuilding the earlier directory project from scratch while closely observing network traffic in browser developer tools made these mechanics intuitive.

Reflecting on my previous capstone submission, I noticed that while the general architecture diagram was sound, my documentation of the caching lifecycle could have been clearer. I would strengthen that design by illustrating the complete write-through flow during POST requests, highlighting exactly when cache keys get invalidated or purged to prevent stale records from lingering.

Looking forward, my priority is building end-to-end backend services using Node.js, Express, and PostgreSQL so I can bring API contracts and relational database models into practical code. Building out solid backend fundamentals will prepare me to move into frontend frameworks like React next.
