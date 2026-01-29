export type TDay = "일" | "월" | "화" | "수" | "목" | "금" | "토";
export const DayList: TDay[] = ["일", "월", "화", "수", "목", "금", "토"];

export type Type = "custom" | "course";
export type FromCustom = "schoolCalendar" | "personalCalendar";
export type FromCourse = "enrollments" | "mentorings";

export type From = FromCustom | FromCourse;

export type TRawCalendar = {
  type: Type;
  from: From;
  courses?: any[];
  events?: any[];
};

export type TRawCustomCalendar = TRawCalendar & {
  type: "custom";
  from: FromCustom;
  events: any[];
};

export type TRawCourseCalendar = TRawCalendar & {
  type: "course";
  from: FromCourse;
  courses: any[];
};

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
      this._date = new Date(
        props.date.getFullYear(),
        props.date.getMonth(),
        props.date.getDate()
      );
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

  getDaysBetween(dateItem: DateItem) {
    const ONE_DAY = 1000 * 60 * 60 * 24;

    const date1_ms = this._date.getTime();
    const date2_ms = dateItem._date.getTime();
    const difference_ms = Math.abs(date1_ms - date2_ms);

    return Math.round(difference_ms / ONE_DAY);
  }

  getDateItemsBetween(_dateItem: DateItem) {
    const dateItems: DateItem[] = [];
    for (
      let dateItem = new DateItem({ date: this._date });
      dateItem.text <= _dateItem.text;
      dateItem = dateItem.getDateItemAfter(1)
    ) {
      dateItems.push(dateItem);
    }
    return dateItems;
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

const getHHMM = (dateStr: string) => {
  const d = new Date(dateStr);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

export class EventItem {
  type: "custom" | "course" = "custom";
  from: From = "schoolCalendar";
  eventId?: string; // CalendarEvent._id for CRUD
  calendarTitle: string = "";
  id: string = ""; // course -> enrollment._id or syllabus._id
  title: string = "";
  isAllday: boolean = true;
  startTimeText: string = "";
  endTimeText: string = "";
  duration?: number = 1;
  sequence: number = 1;

  // custom event fields
  description?: string;
  location?: string;
  color?: string;
  scope?: "school" | "personal";
  userId?: string;
  isRecurrenceInstance?: boolean;
  recurrenceParentId?: string;
}

export class Calendar {
  public _eventMap: Map<string, EventItem[]> = new Map<string, EventItem[]>();

  constructor(props: { year: number }) {
    const startDateItem = new DateItem({ text: `${props.year}-01-01` });
    const endDateItem = new DateItem({ text: `${props.year}-12-31` });
    for (
      let dateItem = startDateItem;
      dateItem.text <= endDateItem.text;
      dateItem = dateItem.getDateItemAfter(1)
    ) {
      this._eventMap.set(dateItem.text, []);
    }
  }

  addCustomEvents(events: any[], from: FromCustom) {
    const type = "custom";
    const calendarTitle =
      from === "schoolCalendar" ? "학교 캘린더" : "개인 캘린더";

    for (const event of events) {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);

      if (event.isAllDay) {
        const startDateItem = new DateItem({ date: startDate });
        const endDateItem = new DateItem({ date: endDate });
        const dateItems = startDateItem.getDateItemsBetween(endDateItem);

        for (let i = 0; i < dateItems.length; i++) {
          this._eventMap.get(dateItems[i].text)?.push({
            type,
            from,
            eventId: event._id,
            calendarTitle,
            id: event._id,
            title:
              event.title +
              (dateItems.length > 1
                ? `(${i + 1}/${dateItems.length})`
                : ""),
            isAllday: true,
            startTimeText: dateItems[i].text,
            endTimeText:
              i < dateItems.length - 1
                ? dateItems[i + 1].text
                : dateItems[i].text,
            sequence: i + 1,
            duration: dateItems.length,
            description: event.description,
            color: event.color,
            scope: event.scope,
            userId: event.user,
            isRecurrenceInstance: event.isRecurrenceInstance,
            recurrenceParentId: event.recurrenceParentId
              ? String(event.recurrenceParentId)
              : undefined,
          });
        }
      } else {
        const startDateItem = new DateItem({ date: startDate });
        const endDateItem = new DateItem({ date: endDate });
        const dateItems = startDateItem.getDateItemsBetween(endDateItem);

        if (dateItems.length === 1) {
          this._eventMap.get(startDateItem.text)?.push({
            type,
            from,
            eventId: event._id,
            calendarTitle,
            id: event._id,
            title: event.title,
            isAllday: false,
            startTimeText:
              startDateItem.text + " " + getHHMM(event.start),
            endTimeText:
              startDateItem.text + " " + getHHMM(event.end),
            sequence: 1,
            duration: 1,
            description: event.description,
            color: event.color,
            scope: event.scope,
            userId: event.user,
            isRecurrenceInstance: event.isRecurrenceInstance,
            recurrenceParentId: event.recurrenceParentId
              ? String(event.recurrenceParentId)
              : undefined,
          });
        } else {
          for (let i = 0; i < dateItems.length; i++) {
            let startTimeText = "";
            let endTimeText = "";
            if (i === 0) {
              startTimeText =
                startDateItem.text + " " + getHHMM(event.start);
              endTimeText = dateItems[i + 1].text;
            } else if (i === dateItems.length - 1) {
              startTimeText = dateItems[i].text;
              endTimeText =
                dateItems[i].text + " " + getHHMM(event.end);
            } else {
              startTimeText = dateItems[i].text;
              endTimeText = dateItems[i + 1].text;
            }
            this._eventMap.get(dateItems[i].text)?.push({
              type,
              from,
              eventId: event._id,
              calendarTitle,
              id: event._id,
              title:
                event.title +
                (dateItems.length > 1
                  ? `(${i + 1}/${dateItems.length})`
                  : ""),
              isAllday: true,
              startTimeText,
              endTimeText,
              sequence: i + 1,
              duration: dateItems.length,
              description: event.description,
              color: event.color,
              scope: event.scope,
              userId: event.user,
              isRecurrenceInstance: event.isRecurrenceInstance,
              recurrenceParentId: event.recurrenceParentId
                ? String(event.recurrenceParentId)
                : undefined,
            });
          }
        }
      }
    }
  }

  addCourseEvents(
    from: FromCourse,
    registration: {
      year: string;
      term: string;
      period?: { start: string; end: string };
    },
    courses: any[]
  ) {
    if (!registration.period) return;

    const calendarTitle = `${registration.year} ${registration.term} ${
      from === "enrollments" ? "수업" : "멘토링 수업"
    }`;

    const map = new Map<
      TDay,
      {
        id: string;
        title: string;
        sequence: number;
        startHHMM: string;
        endHHMM: string;
        classroom: string;
        enrollmentId?: string;
        syllabusId?: string;
      }[]
    >();

    for (let day of DayList) {
      map.set(day, []);
    }

    for (let course of courses) {
      for (let idx = 0; idx < course.time.length; idx++) {
        map.get(course.time[idx].day)?.push({
          id: `${course._id}`,
          sequence: idx + 1,
          title: course.classTitle,
          startHHMM: course.time[idx].start,
          endHHMM: course.time[idx].end,
          classroom: course.classroom,
        });
      }
    }

    const startDate = new DateItem({
      text: registration.period.start,
    });
    const endDate = new DateItem({
      text: registration.period.end,
    });
    const dateItems = startDate.getDateItemsBetween(endDate);

    for (let dateItem of dateItems) {
      for (let enrollment of map.get(dateItem.getDayString()) ?? []) {
        this._eventMap.get(dateItem.text)?.push({
          ...enrollment,
          type: "course",
          from,
          calendarTitle,
          isAllday: false,
          startTimeText: dateItem.text + " " + enrollment.startHHMM,
          endTimeText: dateItem.text + " " + enrollment.endHHMM,
          location: enrollment.classroom,
        });
      }
    }
  }

  getEventMap = (
    startDateItem: DateItem,
    endDateItem: DateItem,
    opts: { from?: string[] } = {}
  ) => {
    const map = new Map<string, EventItem[]>();

    const dateItems = startDateItem.getDateItemsBetween(endDateItem);

    if (opts.from) {
      for (let dateItem of dateItems) {
        const items = this._eventMap.get(dateItem.text) ?? [];
        map.set(
          dateItem.text,
          items.filter((item) => opts.from?.includes(item.from))
        );
      }
    } else {
      for (let dateItem of dateItems) {
        const items = this._eventMap.get(dateItem.text) ?? [];
        map.set(dateItem.text, items);
      }
    }

    return map;
  };

  getFullMonthlyEventMap = (dateItem: DateItem) => {
    const startDateItem = dateItem.getDateItemBefore(dateItem.getDay());

    const _endDateItem = new DateItem({
      fields: {
        yyyy: dateItem.yyyy,
        mm: dateItem.mm + 1,
        dd: 0,
      },
    });
    const endDateItem = _endDateItem.getDateItemAfter(
      6 - _endDateItem.getDay()
    );

    return this.getEventMap(startDateItem, endDateItem, {
      from: ["schoolCalendar", "personalCalendar"],
    });
  };
}
