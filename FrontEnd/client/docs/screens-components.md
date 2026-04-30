# Screens and component usage

## Screens (routes)
- /login -> src/pages/auth/Login/Login.tsx
- /main -> src/pages/main/Dashboard/Dashboard.tsx
  - Dashboard.tsx renders:
    - src/pages/main/Dashboard/AdminDashboard.tsx when role includes admin
    - src/pages/main/Dashboard/StudentDashboard.tsx otherwise (user)
- /exams -> src/pages/main/Exam/ExamList.tsx
- /exam/:examId -> src/pages/main/Exam/ExamTake.tsx
- /result/:examId -> src/pages/main/Exam/ExamResult.tsx
- /prediction -> src/pages/main/Exam/Prediction.tsx
- /my-results -> src/pages/main/Exam/MyResults.tsx
- /profile -> src/pages/main/Profile/Profile.tsx
- /admin/students -> src/pages/main/Admin/StudentManagement.tsx

## Component usage (folders in screenshot)

NavBar
- NavbarNested -> src/components/Layout/LayoutTypes/DefaultLayout.tsx
- Logo -> no usage found in src (only defined in src/components/NavBar/Logo.tsx)

NavigationPatterns
- BackgroundBorderStatus -> storybook only: src/components/NavigationPatterns/BackgroundBorderStatus/BackgroundBorderStatus.stories.tsx
- CompactStatusBar -> storybook only: src/components/NavigationPatterns/CompactStatusBar/CompactStatusBar.stories.tsx
- ContentTabs -> storybook only: src/components/NavigationPatterns/ContentTabs/ContentTabs.stories.tsx
- HorizontalProgress -> storybook only: src/components/NavigationPatterns/HorizontalProgress/HorizontalProgress.stories.tsx
- OrderedList -> storybook only: src/components/NavigationPatterns/OrderedList/OrderedList.stories.tsx
- SectionProgressVertical -> storybook only: src/components/NavigationPatterns/SectionProgressVertical/SectionProgressVertical.stories.tsx
- SegmentedControls -> storybook only: src/components/NavigationPatterns/SegmentedControls/SegmentedControls.stories.tsx
- StandardNumeric -> storybook only: src/components/NavigationPatterns/StandardNumeric/StandardNumeric.stories.tsx

PerformanceChart
- PerformanceChart -> src/pages/main/Dashboard/StudentDashboard.tsx

RecentResults
- RecentResults -> src/pages/main/Dashboard/StudentDashboard.tsx

SideBar
- SideBar -> src/components/Layout/LayoutTypes/DefaultLayout.tsx

StatCard
- StatCard -> src/components/StatsSection/StatsSection.tsx

StatsSection
- StatsSection -> src/pages/main/Dashboard/StudentDashboard.tsx

SwitchLanguage
- LanguageSwitcher -> src/components/SideBar/SideBar.tsx

UpcomingExamsTable
- UpcomingExamsTable -> src/pages/main/Dashboard/StudentDashboard.tsx
