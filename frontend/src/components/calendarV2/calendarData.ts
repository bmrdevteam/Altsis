import _ from "lodash";

export type GoogleCalendarItem = {
  kind: string;
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  summary: string;
  description: string;
  location: string;
  colorId: string;
  creator: {
    id: string;
    email: string;
    displayName: string;
    self: boolean;
  };
  start: {
    date?: Date;
    dateTime?: Date;
  };
  end: {
    date?: Date;
    dateTime?: Date;
  };
  endTimeUnspecified: boolean;
  sequence: number;
  attendees: {
    id: string;
    email: string;
    displayName: string;
    organizer: boolean;
    self: boolean;
    resource: boolean;
    optional: boolean;
    responseStatus: string;
    comment: string;
    additionalGuests: number;
  }[];
  source: {
    url: string;
    title: string;
  };
  attachments: [
    {
      fileUrl: string;
      title: string;
      mimeType: string;
      iconLink: string;
      fileId: string;
    }
  ];
  eventType: string;
};

export type GoogleCalendarData = {
  summary: string;
  description?: string;
  items: GoogleCalendarItem[];
};

export type calendarItem = {
  id: string;
  summary: string;
  description: string;
  isAllday: boolean;
  startTime: Date;
  startTimeText: string;
  endTime: Date;
  endTimeText: string;
  htmlLink: string;
};

export class CalendarData {
  public summary: string = "";
  public description: string | undefined = undefined;
  private _items: calendarItem[] = [];
  private defaultDate: Date = new Date();

  constructor(props: {
    year: number;
    month: number;
    googleCalendar: GoogleCalendarData;
  }) {
    this.summary = props.googleCalendar.summary;
    this.description = props.googleCalendar.description ?? undefined;

    this._items = _.orderBy(
      props.googleCalendar.items.map((_item) => {
        const isAllday = "date" in _item.start;
        const startTime = new Date(
          (isAllday ? _item.start.date + " 00:00" : _item.start.dateTime) ??
            this.defaultDate
        );
        const endTime = new Date(
          (isAllday ? _item.end.date + " 00:00" : _item.end.dateTime) ??
            this.defaultDate
        );

        // console.log({ startTime, endTime });

        const item: calendarItem = {
          ..._item,
          isAllday,
          startTime,
          startTimeText: startTime.toString(),
          endTime,
          endTimeText: endTime.toString(),
        };

        return item;
      }),
      [(item) => item.startTime]
    );
  }

  get items() {
    return this._items;
  }

  set items(items: calendarItem[]) {}
}
