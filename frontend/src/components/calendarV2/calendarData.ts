import { dateFormat } from "functions/functions";
import _ from "lodash";

const dayString = ["일", "월", "화", "수", "목", "금", "토"];
export class DateItem {
  public _date: Date;
  public yyyy: number;
  public mm: number;
  public dd: number;
  public text: string;

  constructor(props: {
    date?: Date;
    fields?: { yyyy: number; mm: number; dd: number };
  }) {
    if (props.date) {
      this._date = props.date;
    } else if (props.fields) {
      this._date = new Date(
        props.fields.yyyy,
        props.fields.mm - 1,
        props.fields.dd
      );
    } else {
      this._date = new Date();
    }

    this.yyyy = this._date.getFullYear();
    this.mm = this._date.getMonth() + 1;
    this.dd = this._date.getDate();

    this.text =
      this.yyyy +
      "-" +
      (this.mm >= 10 ? this.mm : "0" + this.mm) +
      "-" +
      (this.dd >= 10 ? this.dd : "0" + this.dd);
  }

  getDay() {
    return this._date.getDay();
  }

  getDayString() {
    return dayString[this._date.getDay()];
  }

  getDateItemAfter(days: number) {
    const date = new Date(this._date);
    date.setDate(date.getDate() + days);
    return new DateItem({ date });
  }

  getDateItemBefore(days: number) {
    const date = new Date(this._date);
    date.setDate(date.getDate() - days);
    return new DateItem({ date });
  }
}

export type GoogleCalendarItem = {
  id: string;

  kind: string;
  etag: string;

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
    year?: number;
    month?: number;
    googleCalendar: GoogleCalendarData;
  }) {
    this.summary = props.googleCalendar.summary ?? "";
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

        const item: calendarItem = {
          ..._item,
          isAllday,
          startTime,
          startTimeText: dateFormat(startTime),
          endTime,
          endTimeText: dateFormat(endTime),
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

  getItemsByDays(props: { startDate: Date; days: number }) {
    const map = new Map<string, calendarItem[]>();

    const startDateText = dateFormat(props.startDate);
    const endDate = new Date(props.startDate);
    endDate.setDate(props.startDate.getDate() + props.days);
    const endDateText = dateFormat(endDate) + " 11:59:59";

    let idx = _.findIndex(
      this._items,
      (item) => item.endTimeText >= startDateText
    );
    while (idx < this._items.length) {
      if (this._items[idx].startTimeText > endDateText) {
        break;
      }
      const dateString = this._items[idx].startTimeText.split(" ")[0];

      if (!map.has(dateString)) {
        map.set(dateString, []);
      }
      map.get(dateString)?.push(this._items[idx]);
      idx++;
    }
    return map;
  }

  getItemsByDate(props: { startDate: Date; endDate: Date }) {
    const map = new Map<string, calendarItem[]>();
    const startDateText = dateFormat(props.startDate);
    const endDateText = dateFormat(props.endDate) + " 11:59:59";

    let idx = _.findIndex(
      this._items,
      (item) => item.endTimeText >= startDateText
    );
    while (idx < this._items.length) {
      if (this._items[idx].startTimeText > endDateText) {
        break;
      }
      const dateString = this._items[idx].startTimeText.split(" ")[0];

      if (!map.has(dateString)) {
        map.set(dateString, []);
      }
      map.get(dateString)?.push(this._items[idx]);
      idx++;
    }
    return map;
  }

  getEventMap(startDateItem: DateItem, endDateItem: DateItem) {
    const map = new Map<string, calendarItem[]>();
    const startDateText = startDateItem.text;
    const endDateText = endDateItem.text + " 11:59:59";

    for (
      let dateItem = startDateItem;
      dateItem._date <= endDateItem._date;
      dateItem = dateItem.getDateItemAfter(1)
    ) {
      map.set(dateItem.text, []);
    }

    for (let item of this._items) {
      if (
        item.endTimeText >= startDateText &&
        item.startTimeText <= endDateText
      ) {
        const dateItem = new DateItem({ date: item.startTime });
        map.get(dateItem.text)?.push(item);
      }
    }

    return map;
  }
}
