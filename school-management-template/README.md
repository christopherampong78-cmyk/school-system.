# School Management Template (React + Firebase + Netlify)

Version 2 covers every module (students, parents, staff, classes, subjects, terms, grading, attendance, timetables, exams, mark entry, report cards, fees, receipts, expenses), editing on every page, and a Settings page for the school details, logo and login pictures. Version 1 covered: staff/admin sign-in, student sign-in by ID + password, **Student Token** or **QR scan**,
student records (single or bulk add), printable **ID cards with QR**, a student portal, and a dashboard.
The sidebar already lists the next modules (marked "Soon").

## Set up a new client
1. Edit `src/config/school.js` (name, colour, ID prefix, classes, address, phone) and replace `public/logo.svg`.
   Give each client a **unique** `authDomain` (e.g. `students.clientname.local`).
2. Create a Firebase project. Enable **Authentication → Email/Password** and **Firestore**.
3. Paste `firestore.rules` into Firestore → Rules and publish.
4. Copy `.env.example` to `.env` and fill in the web app keys from Firebase project settings.
5. Open the site and tap **Set up this school** on the login page to create the owner account. See NEW-SCHOOL-GUIDE.md.
6. `npm install`, then `npm run dev`. Deploy: connect the repo to Netlify, add the same `VITE_` variables, deploy.

## How student login works
Adding a student creates: a record in `students`, a private token in `tokens` (admin-only), and a Firebase login
with email `<studentId>@<authDomain>` and the token as its password. The token (e.g. `RWA0001-K7P3QX2M`) is printed
on the ID card and encoded in the QR code. The Student Token tab and the QR scanner both sign in with it.

## Known limits (next steps)
- Re-issuing a lost token needs a Cloud Function (the Admin SDK) to change a student's password. Not included yet.
- Photos are resized to ~240px and stored inside the student record. Move to Firebase Storage for large schools.
- Anyone holding the card can sign in as that student, so the portal should only expose low-risk data until you add PINs.
- Not run end-to-end here (no network in the build sandbox). Run `npm install && npm run build` first and send me any error.

## Demo mode
If `.env` has no `VITE_FIREBASE_API_KEY`, the app runs on fake in-browser data (admin@demo.school / admin123, token RWA0001-DEMO0001). Add the Firebase keys to switch to the real database.

## Roles
`owner` (everything, including Settings), `admin` (everything except Settings), `teacher` (attendance, exams, marks, read-only lists), `accountant` (fees, payments, expenses). Create staff logins from the Staff page. Re-publish `firestore.rules` after updating.
