# **App Name**: PHBKT Group Limited - Workflow Management

## Core Features:

- User Authentication: Secure user authentication using Firebase Auth with email/password and role-based access control, leveraging user data stored in Firestore.
- Dynamic Tab Interface: Enable opening work items in dynamic tabs for multitasking. Maintain an `openTabs` state array to manage and render active tabs, including static tabs like 'My Work', 'Search', and 'Global Notes'.
- My Work Dashboard: Display a personalized dashboard with work items assigned to the current user. Fetch data from the `work_items` collection based on the user's UID and present it in a grid with columns for urgency, ID, status, subject, and date.
- Work Item Detail View: Show a detailed view for each work item with a header strip displaying key information, a collapsible 'Processes' accordion, inner tabs for 'Work Overview', 'Notes', 'Contact Info', and 'Tasks'. The 'Notes' tab displays data from the `notes` sub-collection.
- Data Seeding: The application will provide sample data from Firestore.

## Style Guidelines:

- Primary color: Deep maroon (#800000) for headers and primary actions.
- Background color: Light gray (#F5F5F5) for the main content area to provide a professional feel.
- Accent color: A lighter shade of maroon (#A64A4A) for highlighting active tabs and interactive elements, offering contrast while maintaining brand consistency.
- Body text: 'Inter' sans-serif font for clear, readable content.
- Headline text: 'Space Grotesk' sans-serif font for a modern look, primarily for headers, matched with 'Inter' for body text.
- Use Lucide-React icons for a consistent and clean visual language across the application.
- Employ a persistent layout with a top header, tab bar, and main content area to facilitate easy navigation.
- Use subtle transition animations when switching between tabs and loading data to improve the user experience.