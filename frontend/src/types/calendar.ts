export type GoogleCalendarItem = {
  id: string;
  htmlLink: string;
  summary: string;
  description: string;
  location?: string;
  colorId: string;
  start: {
    date?: Date;
    dateTime?: Date;
  };
  end: {
    date?: Date;
    dateTime?: Date;
  };
  sequence: number;
};

export type GoogleCalendarData = {
  summary: string;
  description?: string;
  items: GoogleCalendarItem[];
  backgroundColor: string;
  foregroundColor: string;
};
