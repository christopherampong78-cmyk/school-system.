# Setting up a new school (one copy per school)

Each school gets its own copy of this project, its own Firebase database and its own logins.
Schools never see each other's data.

1. **Copy the project.** Make a new GitHub repository for the school and upload this project into it.
2. **Edit `src/config/school.js`.** Set the school name, ID prefix (for example `KPJ`) and a unique `authDomain`
   (for example `students.kpjhs.local`). Replace `public/logo.svg` if you have the logo ready. Both can also be changed later in Settings,
   except the ID prefix and authDomain.
3. **Create a Firebase project** for the school. Turn on Authentication (Email/Password) and Firestore.
4. **Paste `firestore.rules`** into Firestore > Rules and publish.
5. **Add the Firebase keys** as `VITE_FIREBASE_*` variables (a local `.env` file, and in Netlify for the live site).
6. **Deploy to Netlify** and open the site. The login page shows a **Set up this school** button.
   Tap it and create the **owner account**. Do this yourself, before you share the link with anyone.
7. **Create the school's own logins** from Staff & Teachers: give the head teacher or secretary an `admin` login,
   teachers a `teacher` login and the bursar an `accountant` login.

## Who can do what
- **owner** (you): everything, including Settings (school details, logo, login pictures).
- **admin** (school head or secretary): everything except Settings.
- **teacher**: attendance, exams and mark entry; read-only lists.
- **accountant**: fees, payments and expenses.
- **student**: own ID card and fee balance.
