export type GoogleCalendarItem = {
  id: string;
  htmlLink: string;
  summary: string;
  description: string;
  location?: string;
  colorId: string;
  start: {
    date?: string;
    dateTime?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
  };
  sequence: number;
};

export type GoogleCalendarData = {
  id: string;
  summary: string;
  description?: string;
  items: GoogleCalendarItem[];
  backgroundColor: string;
  foregroundColor: string;
};
