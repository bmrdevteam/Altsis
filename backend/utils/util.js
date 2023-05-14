// syllabus.time을 classroom별로 정리
export const classroomsTable = async (syllabuses) => {
  const table = {};
  await Promise.all(
    syllabuses.map((syllabus) => {
      syllabus.time.forEach((elem) => {
        if (!table[syllabus.classroom]) {
          table[syllabus.classroom] = [elem];
        } else {
          table[syllabus.classroom].push(elem);
        }
      });
    })
  );
  return table;
};

export const checkClassroomAvailable = async (syllabuses, syllabus) => {
  await Promise.all(
    syllabuses.map((s2) => {
      const overlappedBlock = syllabus.isTimeOverlapped(s2);
      if (overlappedBlock) {
        const error = new Error(
          `classroom(${syllabus.classroom}) is unavailable at ${overlappedBlock.label}`
        );
        error.code = 409;
        throw error;
      }
    })
  );
};

export const checkTimeAvailable = async (enrollments, time) => {
  await Promise.all(
    enrollments.map((enrollment) => {
      const overlappedBlock = enrollment.isTimeOverlapped(time);
      if (overlappedBlock) {
        const error = new Error(
          `user(${enrollment.userId},${enrollment.userName}) is unavailable at ${overlappedBlock.label}`
        );
        error.code = 409;
        throw error;
      }
    })
  );
};

// school
export const findSeasonIdx = (school, year, term) => {
  return school["seasons"].findIndex(
    (obj) => obj.year === year && obj.term === term
  );
};

export const checkPermission = (school, seasonIdx, type, schoolUser) => {
  const permission = school["seasons"][seasonIdx]["permissions"][type];

  if (permission[schoolUser.role]) {
    if (permission["blocklist"].some((e) => e.userId === schoolUser.userId)) {
      return false;
    }
    return true;
  } else {
    if (permission["allowlist"].some((e) => e.userId === schoolUser.userId)) {
      return true;
    }
    return false;
  }
};

//schoolUser
export const findRegistrationIdx = (schoolUser, year, term) => {
  let yearIdx = schoolUser["registrations"].findIndex(
    (obj) => obj.year === year
  );

  let termIdx = -1;
  if (yearIdx != -1) {
    termIdx = schoolUser["registrations"][yearIdx]["terms"].findIndex(
      (obj) => obj === term
    );
  }

  return { year: yearIdx, term: termIdx };
};
