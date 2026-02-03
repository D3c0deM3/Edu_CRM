Setup: React_Vite
state_management:Redux toolkit
structure:modular

login_pages:
login/superuser: login for Superuser
login/teachers:login for teachers
UI:left sidebar when I hover or click some button it should open and then data with minimal complexity, more functionality
Implement the functions which are not in backend using the existing data
Colors:green-white
sidebar:Once I enter on the left sidebar there should be all menu like students, payments......
RBA: teachers will have roles field which includes codes like CRUD_STUDENT if this has that teacher should be able to do the CRUD on student otherwise the teacher should not see this 
student: there should be a Student menu on the left sidebar also which will be default screen for students and for teachers and the superusers it will appear as one of the menus: how is this done? by role based access, students are only accessed from /login/student and other menus will be hidden for them:
Optimization: lazy loading, memoization
