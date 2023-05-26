import { dateFormat } from "functions/functions";
import _ from "lodash";
import { TRegistration } from "types/auth";
import { GoogleCalendarData } from "types/calendar";

export type TDay = "일" | "월" | "화" | "수" | "목" | "금" | "토";
export const DayList: TDay[] = ["일", "월", "화", "수", "목", "금", "토"];

export class DateItem {
  public _date: Date;
  public yyyy: number;
  public mm: number;
  public dd: number;
  public text: string;

  constructor(props: {
    date?: Date;
    fields?: { yyyy: number; mm: number; dd: number };
    text?: string;
  }) {
    if (props.date) {
      this._date = props.date;
    } else if (props.fields) {
      this._date = new Date(
        props.fields.yyyy,
        props.fields.mm - 1,
        props.fields.dd
      );
    } else if (props.text) {
      this._date = new Date(props.text);
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
    return DayList[this._date.getDay()];
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

  formatText(opts: 1 | 2 | 3 | 4) {
    if (opts === 1) return `${this.yyyy}년`;
    if (opts === 2) return `${this.yyyy}년 ${this.mm}월`;
    if (opts === 3) return `${this.yyyy}년 ${this.mm}월 ${this.dd}일`;
    if (opts === 4)
      return `${this.yyyy}년 ${this.mm}월 ${this.dd}일 ${
        DayList[this._date.getDay()]
      }요일`;
  }
}

export class TimetableCalendarData {
  public summary: string = "";
  public description: string | undefined = undefined;
  public _items: calendarItem[] = [];

  constructor(registration: TRegistration, enrollments: any[]) {
    this.summary = `${registration.year} ${registration.term}`;

    const map = new Map<TDay, any[]>();
    for (let day of DayList) {
      map.set(day, []);
    }

    for (let enrollment of enrollments) {
      for (let idx = 0; idx < enrollment.time.length; idx++) {
        map.get(enrollment.time[idx].day)?.push({
          id: `${enrollment._id}-${idx}`,
          enrollmentId: enrollment._id,
          summary: enrollment.classTitle,
          startHHMM: enrollment.time[idx].start,
          endHHMM: enrollment.time[idx].end,
        });
      }
    }

    const startDate = new DateItem({ text: registration.period?.start });
    const endDate = new DateItem({ text: registration.period?.end });

    const items = [];
    for (
      let dateItem = startDate;
      dateItem.text <= endDate.text;
      dateItem = dateItem.getDateItemAfter(1)
    ) {
      for (let enrollment of map.get(dateItem.getDayString()) ?? []) {
        items.push({
          ...enrollment,
          isAllday: false,
          startTime: new Date(dateItem.text),
          startTimeText: dateItem.text + " " + enrollment.startHHMM,
          endTime: new Date(dateItem.text),
          endTimeText: dateItem.text + " " + enrollment.endHHMM,
        });
      }
    }

    this._items = items;
  }
}

export class CalendarData {
  public type?: "timetable";
  public summary: string = "";
  public description: string | undefined = undefined;
  public backgroundColor: string | undefined;
  public foregroundColor: string | undefined;

  public _items: calendarItem[] = [];
  private defaultDate: Date = new Date();

  constructor(props: {
    googleCalendar?: GoogleCalendarData;
    timetable?: {
      registration: {
        year: string;
        term: string;
        period?: {
          start: string;
          end: string;
        };
      };
      courseList: any[];
    };
    backgroundColor?: string;
    foregroundColor?: string;
  }) {
    this.backgroundColor = props.backgroundColor ?? "rgb(202, 222, 255)";
    this.foregroundColor = props.foregroundColor ?? "black";

    if (props.googleCalendar) {
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
            type: "calendar",
            calendarSummary: this.summary,
            isAllday,
            startTime,
            startTimeText: dateFormat(startTime),
            endTime,
            endTimeText: dateFormat(endTime),
            backgroundColor: this.backgroundColor,
            foregroundColor: this.foregroundColor,
          };

          return item;
        }),
        [(item) => item.startTime]
      );
    }

    if (props.timetable) {
      this.type = "timetable";
      this.summary = `${props.timetable.registration.year} ${props.timetable.registration.term}`;

      const startDate = new DateItem({
        text: props.timetable.registration.period?.start,
      });
      const endDate = new DateItem({
        text: props.timetable.registration.period?.end,
      });

      const map = new Map<TDay, any[]>();
      for (let day of DayList) {
        map.set(day, []);
      }

      for (let enrollment of props.timetable.courseList) {
        for (let idx = 0; idx < enrollment.time.length; idx++) {
          map.get(enrollment.time[idx].day)?.push({
            ...enrollment,
            id: `${enrollment._id}-${idx}`,
            enrollmentId: enrollment._id,
            summary: enrollment.classTitle,
            isAllday: false,
            startHHMM: enrollment.time[idx].start,
            endHHMM: enrollment.time[idx].end,
          });
        }
      }

      const items = [];
      for (
        let dateItem = startDate;
        dateItem.text <= endDate.text;
        dateItem = dateItem.getDateItemAfter(1)
      ) {
        for (let enrollment of map.get(dateItem.getDayString()) ?? []) {
          items.push({
            ...enrollment,
            type: "timetable",
            startTime: new Date(dateItem.text),
            startTimeText: dateItem.text + " " + enrollment.startHHMM,
            endTime: new Date(dateItem.text),
            endTimeText: dateItem.text + " " + enrollment.endHHMM,
            location: enrollment.classroom,
            backgroundColor: this.backgroundColor,
            foregroundColor: this.foregroundColor,
          });
        }
      }

      this._items = items;
    }
  }
}

export type calendarItem = {
  type: "calendar" | "timetable";
  calendarSummary: string;
  id: string;
  summary: string;
  description?: string;
  location?: string;
  isAllday: boolean;
  startTime?: Date;
  startTimeText: string;
  endTime?: Date;
  endTimeText: string;
  htmlLink?: string;
  enrollmentId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
};

export const getEventMap = (
  calendars: CalendarData[],
  startDateItem: DateItem,
  endDateItem: DateItem
) => {
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

  const items = [];
  for (let calendar of calendars) {
    items.push(
      ...calendar._items.map((item) => {
        return { ...item };
      })
    );
  }
  for (let item of items) {
    if (
      item.endTimeText >= startDateText &&
      item.startTimeText <= endDateText
    ) {
      const startDateItem = new DateItem({ date: item.startTime });
      const endDateItem = new DateItem({ date: item.endTime });

      if (startDateItem.text === endDateItem.text) {
        map.get(startDateItem.text)?.push(item);
      } else {
        const dateList: DateItem[] = [];
        for (
          let dateItem = startDateItem;
          dateItem.text < endDateItem.text;
          dateItem = dateItem.getDateItemAfter(1)
        ) {
          dateList.push(dateItem);
        }
        if (dateList.length === 1) {
          map.get(dateList[0].text)?.push(item);
        } else {
          for (let i = 0; i < dateList.length; i++) {
            map.get(dateList[i].text)?.push({
              ...item,
              summary: item.summary + ` (${i + 1}/${dateList.length})`,
            });
          }
        }
      }
    }
  }

  return map;
};
