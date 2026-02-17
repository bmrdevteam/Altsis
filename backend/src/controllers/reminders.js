/**
 * ReminderAPI namespace
 * @namespace APIs.ReminderAPI
 * @see TReminder in {@link Models.Reminder}
 */
import { logger } from "../log/logger.js";
import {
  Reminder,
  CalendarEvent,
  NotificationSetting,
} from "../models/index.js";
import {
  FIELD_REQUIRED,
  __NOT_FOUND,
} from "../messages/index.js";
import { sendAutoNotification } from "../services/notifications.js";

/**
 * 반복 일정의 인스턴스 생성 (24시간 이내)
 */
function getUpcomingRecurringInstances(event, windowStart, windowEnd) {
  const instances = [];
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  const duration = eventEnd.getTime() - eventStart.getTime();

  const recurrenceEnd = event.recurrence?.endDate
    ? new Date(event.recurrence.endDate)
    : null;

  if (recurrenceEnd && recurrenceEnd < windowStart) {
    return instances;
  }

  const recurrenceType = event.recurrence?.type;
  if (!recurrenceType || recurrenceType === "none") {
    return instances;
  }

  const eventHour = eventStart.getHours();
  const eventMinute = eventStart.getMinutes();

  if (recurrenceType === "weekly") {
    const eventDays =
      event.recurrence?.days?.length > 0
        ? event.recurrence.days
        : [eventStart.getDay()];

    // Check each day in the 24h window
    const checkDate = new Date(windowStart);
    checkDate.setHours(0, 0, 0, 0);
    const endCheck = new Date(windowEnd);
    endCheck.setDate(endCheck.getDate() + 1);
    endCheck.setHours(0, 0, 0, 0);

    while (checkDate < endCheck) {
      const currentDay = checkDate.getDay();
      for (const eventDay of eventDays) {
        if (currentDay !== eventDay) continue;

        const instanceDate = new Date(checkDate);
        instanceDate.setHours(eventHour, eventMinute, 0, 0);

        if (
          instanceDate >= eventStart &&
          (!recurrenceEnd || instanceDate <= recurrenceEnd)
        ) {
          instances.push({
            _id: event._id,
            title: event.title,
            start: instanceDate,
            end: new Date(instanceDate.getTime() + duration),
            color: event.color,
            isRecurring: true,
          });
        }
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
  } else if (recurrenceType === "daily") {
    const checkDate = new Date(windowStart);
    checkDate.setHours(0, 0, 0, 0);
    const endCheck = new Date(windowEnd);
    endCheck.setDate(endCheck.getDate() + 1);
    endCheck.setHours(0, 0, 0, 0);

    while (checkDate < endCheck) {
      const instanceDate = new Date(checkDate);
      instanceDate.setHours(eventHour, eventMinute, 0, 0);

      if (
        instanceDate >= eventStart &&
        (!recurrenceEnd || instanceDate <= recurrenceEnd)
      ) {
        instances.push({
          _id: event._id,
          title: event.title,
          start: instanceDate,
          end: new Date(instanceDate.getTime() + duration),
          color: event.color,
          isRecurring: true,
        });
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
  } else if (recurrenceType === "monthly") {
    const eventDate = eventStart.getDate();
    const checkDate = new Date(windowStart);
    checkDate.setDate(eventDate);
    checkDate.setHours(eventHour, eventMinute, 0, 0);

    // Check this month and next month
    for (let i = 0; i < 2; i++) {
      if (
        checkDate >= eventStart &&
        (!recurrenceEnd || checkDate <= recurrenceEnd)
      ) {
        instances.push({
          _id: event._id,
          title: event.title,
          start: new Date(checkDate),
          end: new Date(checkDate.getTime() + duration),
          color: event.color,
          isRecurring: true,
        });
      }
      checkDate.setMonth(checkDate.getMonth() + 1);
    }
  }

  return instances;
}

/**
 * @memberof APIs.ReminderAPI
 * @function create
 * @description 독립 리마인더 생성
 */
export const create = async (req, res) => {
  try {
    for (const field of ["title", "reminderTime"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const reminderTime = new Date(req.body.reminderTime);

    const reminder = await Reminder(req.user.academyId).create({
      user: req.user._id,
      userId: req.user.userId,
      userName: req.user.userName,
      title: req.body.title,
      memo: req.body.memo || "",
      reminderTime,
    });

    // 리마인더 시간이 이미 지났거나 1분 이내이면 즉시 알림 발송
    const now = new Date();
    if (reminderTime.getTime() <= now.getTime() + 60 * 1000) {
      try {
        await sendAutoNotification({
          academyId: req.user.academyId,
          toUserList: [
            {
              user: req.user._id,
              userId: req.user.userId,
              userName: req.user.userName,
            },
          ],
          notificationType: "reminder",
          category: "리마인더",
          title: reminder.title,
          description: reminder.memo || "",
          relatedEntity: {
            type: "reminder",
            id: reminder._id,
          },
        });
        reminder.notified = true;
        await reminder.save();
      } catch (notifErr) {
        logger.error(`Immediate reminder notification failed: ${notifErr.message}`);
      }
    }

    return res.status(200).send({ reminder });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReminderAPI
 * @function findUpcoming
 * @description 24시간 이내 리마인더 통합 조회 (독립 + 이벤트 기반)
 */
export const findUpcoming = async (req, res) => {
  try {
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. 독립 리마인더 조회 (미완료: 과거 미통보 포함 + 24시간 이내)
    const standaloneReminders = await Reminder(req.user.academyId)
      .find({
        user: req.user._id,
        completed: false,
        $or: [
          { reminderTime: { $gte: now, $lte: next24h } },
          { reminderTime: { $lt: now }, notified: false },
        ],
      })
      .sort({ reminderTime: 1 })
      .lean();

    // 2. 이벤트 기반 리마인더 조회
    const eventReminders = [];

    // 사용자 기본 설정 조회
    let defaultMinutes = 15;
    const settingDoc = await NotificationSetting(req.user.academyId).findOne({
      user: req.user._id,
    });
    if (settingDoc?.settings?.eventReminderDefault) {
      defaultMinutes = settingDoc.settings.eventReminderDefault;
    }

    // reminder.enabled=true인 이벤트 조회
    // 24시간 + 최대 리마인더 시간(1440분=1일)을 고려하여 검색 범위 확장
    const maxReminderMinutes = 1440;
    const searchEnd = new Date(
      next24h.getTime() + maxReminderMinutes * 60 * 1000
    );

    // 비반복 이벤트
    const nonRecurringEvents = await CalendarEvent(req.user.academyId)
      .find({
        "reminder.enabled": true,
        isAllDay: false,
        sourceType: { $in: ["manual", null] },
        $or: [
          { "recurrence.type": "none" },
          { "recurrence.type": { $exists: false } },
          { recurrence: { $exists: false } },
        ],
        $and: [
          {
            $or: [
              { user: req.user._id },
              { scope: "school" },
            ],
          },
        ],
        start: { $gte: now, $lte: searchEnd },
      })
      .lean();

    for (const event of nonRecurringEvents) {
      const minutesBefore = event.reminder.useDefault
        ? defaultMinutes
        : event.reminder.minutesBefore || defaultMinutes;
      const reminderTime = new Date(
        new Date(event.start).getTime() - minutesBefore * 60 * 1000
      );

      if (reminderTime >= now && reminderTime <= next24h) {
        eventReminders.push({
          type: "event",
          reminderTime: reminderTime.toISOString(),
          data: {
            _id: String(event._id),
            title: event.title,
            eventStart: new Date(event.start).toISOString(),
            reminderTime: reminderTime.toISOString(),
            minutesBefore,
            color: event.color,
            isRecurring: false,
          },
        });
      }
    }

    // 반복 이벤트
    const recurringEvents = await CalendarEvent(req.user.academyId)
      .find({
        "reminder.enabled": true,
        isAllDay: false,
        sourceType: { $in: ["manual", null] },
        "recurrence.type": { $in: ["daily", "weekly", "monthly"] },
        start: { $lte: searchEnd },
        $or: [
          { "recurrence.endDate": { $gte: now } },
          { "recurrence.endDate": { $exists: false } },
          { "recurrence.endDate": null },
        ],
        $and: [
          {
            $or: [
              { user: req.user._id },
              { scope: "school" },
            ],
          },
        ],
      })
      .lean();

    for (const event of recurringEvents) {
      const minutesBefore = event.reminder.useDefault
        ? defaultMinutes
        : event.reminder.minutesBefore || defaultMinutes;

      const instances = getUpcomingRecurringInstances(event, now, searchEnd);
      for (const instance of instances) {
        const reminderTime = new Date(
          instance.start.getTime() - minutesBefore * 60 * 1000
        );

        if (reminderTime >= now && reminderTime <= next24h) {
          eventReminders.push({
            type: "event",
            reminderTime: reminderTime.toISOString(),
            data: {
              _id: String(event._id),
              title: instance.title,
              eventStart: instance.start.toISOString(),
              reminderTime: reminderTime.toISOString(),
              minutesBefore,
              color: instance.color,
              isRecurring: true,
            },
          });
        }
      }
    }

    // 3. 통합 및 정렬
    const reminders = [
      ...standaloneReminders.map((r) => ({
        type: "standalone",
        reminderTime: new Date(r.reminderTime).toISOString(),
        data: r,
      })),
      ...eventReminders,
    ].sort(
      (a, b) =>
        new Date(a.reminderTime).getTime() -
        new Date(b.reminderTime).getTime()
    );

    return res.status(200).send({ reminders });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReminderAPI
 * @function complete
 * @description 리마인더 완료 처리
 */
export const complete = async (req, res) => {
  try {
    const reminder = await Reminder(req.user.academyId).findOne({
      _id: req.params._id,
      user: req.user._id,
    });

    if (!reminder) {
      return res.status(404).send({ message: __NOT_FOUND("reminder") });
    }

    reminder.completed = true;
    await reminder.save();

    return res.status(200).send({ reminder });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReminderAPI
 * @function update
 * @description 리마인더 수정
 */
export const update = async (req, res) => {
  try {
    const reminder = await Reminder(req.user.academyId).findOne({
      _id: req.params._id,
      user: req.user._id,
    });

    if (!reminder) {
      return res.status(404).send({ message: __NOT_FOUND("reminder") });
    }

    if (req.body.title !== undefined) reminder.title = req.body.title;
    if (req.body.memo !== undefined) reminder.memo = req.body.memo;
    if (req.body.reminderTime !== undefined) {
      reminder.reminderTime = new Date(req.body.reminderTime);
      reminder.notified = false;
    }

    await reminder.save();

    return res.status(200).send({ reminder });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReminderAPI
 * @function remove
 * @description 리마인더 삭제
 */
export const remove = async (req, res) => {
  try {
    const reminder = await Reminder(req.user.academyId).findOne({
      _id: req.params._id,
      user: req.user._id,
    });

    if (!reminder) {
      return res.status(404).send({ message: __NOT_FOUND("reminder") });
    }

    await reminder.deleteOne();

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
