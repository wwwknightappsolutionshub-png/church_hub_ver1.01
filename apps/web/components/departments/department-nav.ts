import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Cake,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Heart,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Mic2,
  Music,
  Package,
  School,
  Send,
  Stethoscope,
  Users,
} from 'lucide-react';
import type { DepartmentNavGroup, DepartmentTabItem } from '@/components/departments/DepartmentLayout';

function group(id: string, label: string, items: DepartmentTabItem[]): DepartmentNavGroup {
  return { id, label, items };
}

function item(id: string, label: string, icon?: LucideIcon, description?: string): DepartmentTabItem {
  return { id, label, icon, description };
}

export function buildDepartmentNavGroups(departmentCode: string): DepartmentNavGroup[] {
  if (departmentCode === 'CHILDREN') {
    return [
      group('overview', 'Overview', [
        item('dashboard', 'Home', LayoutDashboard, 'Stats and upcoming activity'),
      ]),
      group('ministry', 'Ministry roster', [
        item('children-list', 'Children', Users, 'Registered children and class assignments'),
        item('children-parents', 'Parents', Users, 'Guardian links and contact details'),
        item('children-teachers', 'Teachers', Users, 'Duty roster and coordinators'),
        item('children-birthdays', 'Birthdays', Cake, 'Upcoming celebrations and parent emails'),
      ]),
      group('sunday', 'Sunday service', [
        item('children-checkin', 'Check-in', CheckCircle2, 'Tap children to check in or out'),
        item('children-reports', 'Class reporting', ClipboardList, 'Lesson and behaviour notes'),
        item('children-sunday-report', 'Sunday report', Send, 'One-click report to admin & pastor'),
      ]),
      group('team', 'Teaching team', [
        item('children-roster', 'Duty roster', Calendar, 'Weekly teacher assignments'),
        item('children-curriculum', 'Curriculum', BookOpen, 'Lessons and teaching materials'),
      ]),
      group('leadership', 'Leadership', [
        item('children-classes', 'Classes', School, 'Age groups and class names'),
        item('reports', 'Reports', ClipboardList, 'Weekly department reports'),
        item('feedbacks', 'Feedbacks', Inbox, 'Member and volunteer feedback'),
        item('resources', 'Library', BookOpen, 'Shared documents and resources'),
        item('messages', 'Forum', MessageSquare, 'Unit discussion board'),
      ]),
    ];
  }

  if (departmentCode === 'PRAYER') {
    return [
      group('overview', 'Overview', [
        item('dashboard', 'Home', LayoutDashboard, 'Prayer squad dashboard'),
      ]),
      group('operations', 'Operations', [
        item('prayer-assignments', 'Assignment board', ClipboardList, 'Intercessor assignments'),
        item('prayer-schedule', 'Prayer schedule', Calendar, 'Rotas and coverage'),
        item('prayer-intake', 'Request intake', Heart, 'New prayer requests'),
        item('prayer-progress', 'Progress', CheckCircle2, 'Follow-up on open requests'),
        item('prayer-scripture', 'Scripture guide', BookOpen, 'Prayer points and verses'),
      ]),
      group('leadership', 'Leadership', [
        item('reports', 'Reports', ClipboardList, 'Weekly reports'),
        item('feedbacks', 'Feedbacks', Inbox, 'Team feedback'),
        item('resources', 'Library', BookOpen, 'Shared resources'),
        item('messages', 'Forum', MessageSquare, 'Unit discussion'),
      ]),
    ];
  }

  if (departmentCode === 'CHOIR') {
    return [
      group('overview', 'Overview', [
        item('dashboard', 'Home', LayoutDashboard, 'Choir dashboard'),
      ]),
      group('team', 'Team', [
        item('choir-roster', 'Roster', Calendar, 'Service assignments'),
        item('choir-attendance', 'Attendance', Clock, 'Rehearsal and service rolls'),
        item('choir-talent', 'Talent', Mic2, 'Auditions and voice parts'),
      ]),
      group('music', 'Music', [
        item('choir-library', 'Song library', Music, 'Scores and recordings'),
        item('choir-planning', 'Planning', ClipboardList, 'Set lists and service prep'),
      ]),
      group('leadership', 'Leadership', [
        item('reports', 'Reports', ClipboardList, 'Weekly reports'),
        item('feedbacks', 'Feedbacks', Inbox, 'Team feedback'),
        item('resources', 'Library', BookOpen, 'Shared resources'),
        item('messages', 'Forum', MessageSquare, 'Unit discussion'),
      ]),
    ];
  }

  const operations: DepartmentTabItem[] = [
    item('attendance', 'Attendance', Users, 'Roll call and presence'),
    item('schedules', 'Schedule', Calendar, 'Upcoming duties and events'),
    item('assignments', 'Assignments', ClipboardList, 'Tasks and roles'),
  ];

  if (departmentCode === 'MEDICAL' || departmentCode === 'MEDIA') {
    operations.push(item('inventory', 'Inventory', Package, 'Stock and supplies'));
  }
  if (departmentCode === 'MEDIA') {
    operations.push(item('tasks', 'Projects', ClipboardList, 'Media project board'));
  }
  operations.push(item('resources', 'Library', BookOpen, 'Shared documents'));

  const leadership: DepartmentTabItem[] = [
    item('reports', 'Reports', ClipboardList, 'Weekly reports'),
    item('feedbacks', 'Feedbacks', Inbox, 'Team feedback'),
    item('messages', 'Forum', MessageSquare, 'Unit discussion'),
  ];

  if (departmentCode === 'MEDICAL') {
    operations.push(
      item('special', 'Incidents', Stethoscope, 'Medical incident log'),
    );
  } else if (departmentCode === 'MEDIA') {
    operations.push(item('special', 'Skills', Heart, 'Team skills register'));
  }

  return [
    group('overview', 'Overview', [
      item('dashboard', 'Home', LayoutDashboard, 'Department dashboard'),
    ]),
    group('operations', 'Operations', operations),
    group('leadership', 'Leadership', leadership),
  ];
}

export function flattenDepartmentNavGroups(navGroups: DepartmentNavGroup[]): DepartmentTabItem[] {
  return navGroups.flatMap((g) => g.items);
}
