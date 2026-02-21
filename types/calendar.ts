// types/calendar.ts

export type CalendarProvider = 'google' | 'outlook' | 'apple';

export interface NormalizedEvent {
  id: string;
  provider: CalendarProvider;
  title: string; // Often hidden for "Free/Busy" views depending on privacy rules
  startTime: string; // ISO 8601 string
  endTime: string;   // ISO 8601 string
  status: 'busy' | 'free' | 'tentative';
  employeeId: string;
}

export interface EmployeeAvailability {
  employeeId: string;
  name: string;
  events: NormalizedEvent[];
}